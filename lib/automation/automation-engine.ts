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

import {
  NotificationStatus,
  NotificationType,
  UserRole,
} from "@prisma/client";

// Executes the registered internal automation rules for one event. Called by the
// central dispatcher for every stored RideGridEvent. Only in-app notification records
// are created here; external channels (email/SMS/WhatsApp) are not connected, and
// rules that need them are never selected (see `requires` in automation-rules.ts).

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
    if (rule.action !== AutomationAction.CREATE_NOTIFICATION || !rule.recipient || !rule.template)
      throw new Error(`Unsupported automation action: ${rule.action}`);
    const userIds = await this.recipients(rule.recipient, request, resolved);
    if (!userIds.length) return 0;
    const { title, message } = rule.template({ ref: resolved.ref, pickup: resolved.pickup, metadata: request.context.metadata ?? {} });
    const now = new Date();
    // In-app inbox records are delivered by being stored; the apps read them directly.
    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, notificationType: NotificationType.PUSH, title, message, status: NotificationStatus.SENT, sentAt: now })),
    });
    return userIds.length;
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
