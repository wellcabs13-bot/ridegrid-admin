import {
  AutomationExecutionRequest,
  AutomationExecutionResponse,
  AutomationRuleResult,
} from "./automation-types";

import {
  AutomationAction,
  AutomationRecipient,
} from "@/types/automation";

import {
  AutomationRuleDefinition,
  getAutomationRules,
  RULE_SETTING_PREFIX,
  ruleSettingKey,
} from "./automation-rules";

import { prisma } from "@/lib/prisma";
import { emailProvider, logEmailResult } from "@/lib/notifications/email";
import { sendPush } from "@/lib/notifications/push";
import { approvalTarget, type NotificationTarget } from "@/lib/notifications/NotificationTargets";

import {
  NotificationStatus,
  NotificationType,
  UserRole,
} from "@prisma/client";

// Executes the registered internal automation rules for one event. Called by the
// central dispatcher for every stored RideGridEvent. In-app notification records are
// the source of truth; device push mirrors them after they are stored, and email rules
// send through the EmailProvider. Rules whose channel is not configured are never
// selected (see ruleRequirement in automation-rules.ts). SMS/WhatsApp are not connected.

type Resolved = {
  ref: string;
  pickup: string | null;
  vendorUserId: string | null;
  driverUserId: string | null;
};

const formatWhen = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
};

// Admin on/off switches are stored as GLOBAL SystemSetting rows. A rule without a
// row runs with its code default.
export async function loadRuleOverrides(): Promise<Map<string, boolean>> {
  const rows = await prisma.systemSetting.findMany({
    where: { settingKey: { startsWith: RULE_SETTING_PREFIX } },
    select: { settingKey: true, settingValue: true },
  });
  const overrides = new Map<string, boolean>();
  for (const row of rows) {
    const id = row.settingKey.slice(RULE_SETTING_PREFIX.length).replace(/\.enabled$/, "");
    overrides.set(id, row.settingValue === "true");
  }
  return overrides;
}

export function isRuleEnabled(rule: AutomationRuleDefinition, overrides: Map<string, boolean>) {
  return overrides.get(rule.id) ?? rule.enabled;
}

export async function setRuleEnabled(id: string, enabled: boolean) {
  await prisma.systemSetting.upsert({
    where: { settingKey: ruleSettingKey(id) },
    update: { settingValue: String(enabled) },
    create: { settingKey: ruleSettingKey(id), settingValue: String(enabled), settingType: "BOOLEAN", scope: "GLOBAL", description: `Automation rule ${id} on/off` },
  });
}

export class AutomationEngine {
  async execute(
    request: AutomationExecutionRequest
  ): Promise<AutomationExecutionResponse> {
    const matched = getAutomationRules(request.trigger);
    const done = new Set(request.completedRuleIds ?? []);
    const overrides = matched.length ? await loadRuleOverrides() : new Map<string, boolean>();
    const results: AutomationRuleResult[] = [];
    const actions: AutomationAction[] = [];
    let resolved: Resolved | null = null;

    for (const rule of matched) {
      if (done.has(rule.id)) {
        results.push({ ruleId: rule.id, status: "ALREADY_COMPLETED" });
        continue;
      }
      if (!isRuleEnabled(rule, overrides)) {
        results.push({ ruleId: rule.id, status: "SKIPPED_DISABLED" });
        continue;
      }
      try {
        resolved ??= await this.resolve(request);
        const notified = await this.executeRule(rule, request, resolved);
        results.push({ ruleId: rule.id, status: "EXECUTED", notified });
        actions.push(rule.action);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown automation error.";
        results.push({ ruleId: rule.id, status: "FAILED", error: message });
        console.error(`[Automation] ${rule.id} ${rule.name} failed:`, message);
      }
    }

    const failures = results.filter(r => r.status === "FAILED");
    const executedRules = results.filter(r => r.status === "EXECUTED").length;
    return {
      success: failures.length === 0,
      executedRules,
      actions,
      results,
      message:
        failures.length === 0
          ? `Automation completed: ${executedRules} rule(s) executed.`
          : `Automation completed with ${failures.length} failure(s): ${failures.map(f => `${f.ruleId}: ${f.error}`).join("; ")}`,
    };
  }

  private async executeRule(
    rule: AutomationRuleDefinition,
    request: AutomationExecutionRequest,
    resolved: Resolved
  ): Promise<number> {
    const input = { ref: resolved.ref, pickup: resolved.pickup, metadata: request.context.metadata ?? {} };
    if (rule.action === AutomationAction.SEND_EMAIL && rule.recipient && rule.email)
      return this.sendEmail(rule, await this.recipients(rule.recipient, request, resolved), rule.email(input), request);
    if (rule.action !== AutomationAction.CREATE_NOTIFICATION || !rule.recipient || !rule.template)
      throw new Error(`Unsupported automation action: ${rule.action}`);
    const userIds = await this.recipients(rule.recipient, request, resolved);
    if (!userIds.length) return 0;
    const { title, message } = rule.template(input);
    const now = new Date();
    // In-app inbox records are delivered by being stored; the apps read them directly.
    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, notificationType: NotificationType.PUSH, title, message, status: NotificationStatus.SENT, sentAt: now })),
    });
    // Device push mirrors the stored notification. Best-effort and not awaited: a push
    // outage never fails or delays the event. Only a navigation hint is sent.
    const bookingId = request.context.bookingId;
    const target: NotificationTarget | null = bookingId ? { type: "booking", id: bookingId, bookingNumber: resolved.ref } : approvalTarget(title);
    void sendPush(userIds.map(userId => ({ userId, title, message, target })));
    return userIds.length;
  }

  // One email per recipient through the EmailProvider. A rule that already completed
  // is never re-run for the same event (completedRuleIds), so a retry does not resend.
  // Only a total, retryable failure fails the rule so the retry queue tries again.
  private async sendEmail(rule: AutomationRuleDefinition, userIds: string[], content: { subject: string; text: string }, request: AutomationExecutionRequest): Promise<number> {
    if (!userIds.length) return 0;
    const users = await prisma.user.findMany({ where: { id: { in: userIds }, isActive: true, deletedAt: null }, select: { id: true, name: true, email: true } });
    let sent = 0;
    const retryable: string[] = [];
    for (const u of users) {
      const result = await emailProvider.send({ to: { address: u.email, name: u.name }, subject: content.subject, text: content.text, reference: `${rule.id}:${request.context.bookingId ?? request.context.userId ?? "event"}` });
      await logEmailResult(u.email, content.subject, result);
      if (result.status === "SENT") sent++;
      else if (result.status === "FAILED" && result.retryable) retryable.push(result.error);
      else if (result.status === "FAILED") console.error(`[Automation] ${rule.id} email not accepted: ${result.error}`);
    }
    if (!sent && retryable.length) throw new Error(`Email delivery failed: ${retryable[0]}`);
    return sent;
  }

  // Loads what the templates and recipient lookups need, once per event.
  private async resolve(request: AutomationExecutionRequest): Promise<Resolved> {
    const { bookingId, vendorId, driverId, metadata = {} } = request.context;
    const booking = bookingId
      ? await prisma.booking.findUnique({ where: { id: bookingId }, select: { bookingNumber: true, pickupDateTime: true } })
      : null;
    const [vendor, driver] = await Promise.all([
      vendorId ? prisma.vendor.findUnique({ where: { id: vendorId }, select: { user: { select: { id: true, isActive: true, deletedAt: true } } } }) : null,
      driverId ? prisma.driver.findUnique({ where: { id: driverId }, select: { user: { select: { id: true, isActive: true, deletedAt: true } } } }) : null,
    ]);
    const live = (u?: { id: string; isActive: boolean; deletedAt: Date | null } | null) => (u && u.isActive && !u.deletedAt ? u.id : null);
    const number = booking?.bookingNumber ?? (typeof metadata.bookingNumber === "string" ? metadata.bookingNumber : null);
    return {
      ref: number ?? "Your booking",
      pickup: formatWhen(booking?.pickupDateTime ?? (typeof metadata.pickupDateTime === "string" ? metadata.pickupDateTime : null)),
      vendorUserId: live(vendor?.user),
      driverUserId: live(driver?.user),
    };
  }

  private async recipients(
    recipient: AutomationRecipient,
    request: AutomationExecutionRequest,
    resolved: Resolved
  ): Promise<string[]> {
    const metadata = request.context.metadata ?? {};
    switch (recipient) {
      case "TRAVELLER":
        return request.context.userId ? [request.context.userId] : [];
      case "VENDOR":
        return resolved.vendorUserId ? [resolved.vendorUserId] : [];
      case "DRIVER":
        return resolved.driverUserId ? [resolved.driverUserId] : [];
      case "CORPORATE_APPROVERS": {
        const corporateId = typeof metadata.corporateId === "string" ? metadata.corporateId : null;
        if (!corporateId) throw new Error("corporateId is required to notify corporate approvers.");
        const admins = await prisma.user.findMany({
          where: { role: UserRole.CORPORATE_ADMIN, isActive: true, deletedAt: null, corporateEmployee: { corporateId, isActive: true } },
          select: { id: true },
        });
        // The step's assigned approver, only when they belong to the same company.
        const assigned = Array.isArray(metadata.approverUserIds) ? metadata.approverUserIds.filter((v): v is string => typeof v === "string").slice(0, 10) : [];
        const approvers = assigned.length
          ? await prisma.user.findMany({ where: { id: { in: assigned }, isActive: true, deletedAt: null, corporateEmployee: { corporateId, isActive: true } }, select: { id: true } })
          : [];
        return [...new Set([...admins, ...approvers].map(a => a.id))];
      }
      case "FINANCE_TEAM": {
        const staff = await prisma.user.findMany({
          where: { role: { in: [UserRole.SUPER_ADMIN, UserRole.FINANCE] }, isActive: true, deletedAt: null },
          select: { id: true },
        });
        return staff.map(s => s.id);
      }
    }
  }
}

export const automationEngine =
  new AutomationEngine();
