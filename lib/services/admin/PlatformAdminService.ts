import { AuditAction, NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rolePermissionMatrix } from "@/lib/permissions";
import { automationRules, getAutomationRuleById, ruleRequirement } from "@/lib/automation/automation-rules";
import { emailConfig, pushConfig } from "@/lib/notifications/channels";
import { isRuleEnabled, loadRuleOverrides, setRuleEnabled } from "@/lib/automation/automation-engine";
import { processRetryQueue, storedAutomation } from "@/lib/events/event-dispatcher";
import { AutomationAction, AutomationTrigger, type AutomationRuntimeStatus } from "@/types/automation";
import { AccountLifecycleError, audit } from "@/lib/services/admin/AccountLifecycleService";
import { addDays } from "@/lib/services/admin/metrics";

// Notification, automation, security and AI status for the Super Admin, reported
// from what is actually stored and configured. External providers are shown as
// "not configured" until real credentials exist.

const configured = (...keys: string[]) => keys.every(k => !!process.env[k]);

// Status comes only from real server configuration; the reason names the missing
// setting, never a secret value.
export function channelStatus() {
  const email = emailConfig(), push = pushConfig();
  return [
    { channel: "IN_APP", label: "In-app inbox (apps & portals)", status: "ACTIVE", detail: "Stored in the central Notification table and shown in the customer, driver, vendor and corporate apps." },
    { channel: "EMAIL", label: "Email (Zoho CPaaS)", status: email.ok ? "ACTIVE" : "NOT_CONFIGURED", detail: email.ok ? `Sending as ${email.config.fromName} <${email.config.fromAddress}>.` : `Email is not delivered: ${email.reason}` },
    { channel: "SMS", label: "SMS", status: "NOT_CONFIGURED", detail: "No SMS provider is connected." },
    { channel: "WHATSAPP", label: "WhatsApp", status: "NOT_CONFIGURED", detail: "No WhatsApp provider is connected." },
    { channel: "DEVICE_PUSH", label: "Device push (Expo / FCM)", status: push.ok ? "ACTIVE" : "NOT_CONFIGURED", detail: push.ok ? "Signed-in apps register their device; in-app notifications are mirrored as push." : `Push is not delivered: ${push.reason} Apps read the in-app inbox.` },
  ];
}

export async function notificationsView(f: { type?: string; status?: string; q?: string; page?: number }) {
  const page = Math.max(f.page || 1, 1), pageSize = 25;
  const where: Prisma.NotificationWhereInput = {
    ...(f.type && Object.values(NotificationType).includes(f.type as NotificationType) ? { notificationType: f.type as NotificationType } : {}),
    ...(f.status && Object.values(NotificationStatus).includes(f.status as NotificationStatus) ? { status: f.status as NotificationStatus } : {}),
    ...(f.q ? { OR: [{ title: { contains: f.q, mode: "insensitive" } }, { message: { contains: f.q, mode: "insensitive" } }, { user: { email: { contains: f.q, mode: "insensitive" } } }] } : {}),
  };
  const [byTypeStatus, total, rows, email, sms, whatsapp] = await Promise.all([
    prisma.notification.groupBy({ by: ["notificationType", "status"], _count: { _all: true } }),
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, notificationType: true, title: true, message: true, status: true, sentAt: true, readAt: true, createdAt: true, user: { select: { name: true, email: true, role: true } } } }),
    prisma.emailTemplate.findMany({ orderBy: { templateName: "asc" }, select: { id: true, templateName: true, subject: true, isActive: true, updatedAt: true } }),
    prisma.sMSTemplate.findMany({ orderBy: { templateName: "asc" }, select: { id: true, templateName: true, message: true, isActive: true, updatedAt: true } }),
    prisma.whatsAppTemplate.findMany({ orderBy: { templateName: "asc" }, select: { id: true, templateName: true, message: true, isActive: true, updatedAt: true } }),
  ]);
  return {
    channels: channelStatus(),
    summary: byTypeStatus.map(r => ({ type: r.notificationType, status: r.status, count: r._count._all })),
    rows, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)),
    templates: {
      EMAIL: email.map(t => ({ id: t.id, name: t.templateName, preview: t.subject, active: t.isActive, updatedAt: t.updatedAt })),
      SMS: sms.map(t => ({ id: t.id, name: t.templateName, preview: t.message, active: t.isActive, updatedAt: t.updatedAt })),
      WHATSAPP: whatsapp.map(t => ({ id: t.id, name: t.templateName, preview: t.message, active: t.isActive, updatedAt: t.updatedAt })),
    },
  };
}

export async function setTemplateActive(kind: string, id: string, active: boolean, actorId: string) {
  const data = { isActive: active };
  if (kind === "EMAIL") await prisma.emailTemplate.update({ where: { id }, data });
  else if (kind === "SMS") await prisma.sMSTemplate.update({ where: { id }, data });
  else if (kind === "WHATSAPP") await prisma.whatsAppTemplate.update({ where: { id }, data });
  else throw new AccountLifecycleError(400, "Unknown template type.");
  await audit(prisma, { actorId, action: AuditAction.UPDATE, entityName: `${kind}Template`, entityId: id, newValue: { event: active ? "TEMPLATE_ENABLED" : "TEMPLATE_DISABLED" } });
}

// Central events, where they are emitted, and what happens outside the rule engine
// (writes made atomically by the emitting workflow itself). Rule-driven actions are
// listed from the automation registry.
const WORKFLOWS: { trigger: AutomationTrigger; when: string; builtIn: string[] }[] = [
  { trigger: AutomationTrigger.BOOKING_CREATED, when: "A booking is confirmed (Corporate Credit booking, or PayU payment verified)", builtIn: [] },
  { trigger: AutomationTrigger.PAYMENT_RECEIVED, when: "PayU payment verified", builtIn: [] },
  { trigger: AutomationTrigger.BOOKING_CANCELLED, when: "Cancelled through the central cancellation workflow", builtIn: ["Driver inbox notification", "Corporate credit restored, or refund recorded as due"] },
  { trigger: AutomationTrigger.REFUND_DUE, when: "A cancellation leaves an online payment to refund", builtIn: ["Pending refund listed in Finance → Refunds"] },
  { trigger: AutomationTrigger.DRIVER_ASSIGNED, when: "Admin reassigns the driver on a booking", builtIn: ["New driver's inbox notification"] },
  { trigger: AutomationTrigger.TRIP_COMPLETED, when: "Driver completes the trip in the driver app, or Operations marks it complete", builtIn: ["Driver-app completion notifies driver, traveller and vendor", "Vendor earning counted in Finance"] },
  { trigger: AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, when: "An employee submits an out-of-policy ride for approval", builtIn: [] },
  { trigger: AutomationTrigger.CORPORATE_APPROVED, when: "The final approval step is approved", builtIn: ["Approval can be used for exactly one booking at a fresh price"] },
  { trigger: AutomationTrigger.CORPORATE_REJECTED, when: "An approver rejects the request", builtIn: [] },
  { trigger: AutomationTrigger.VENDOR_APPROVED, when: "Super Admin verifies a vendor", builtIn: [] },
];

const CHANNEL: Partial<Record<AutomationAction, string>> = {
  [AutomationAction.CREATE_NOTIFICATION]: "In-app", [AutomationAction.SEND_EMAIL]: "Email",
  [AutomationAction.SEND_WHATSAPP]: "WhatsApp", [AutomationAction.SEND_SMS]: "SMS",
};

export async function automationView() {
  const since = addDays(new Date(), -30);
  const [stats, failed, retry, recent, overrides] = await Promise.all([
    prisma.rideGridEvent.groupBy({ by: ["eventType", "status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.rideGridEvent.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, eventType: true, module: true, bookingId: true, errorMessage: true, createdAt: true } }),
    prisma.eventRetryQueue.groupBy({ by: ["status"], _count: { _all: true } }),
    // Bounded window used to report per-rule executions and failures.
    prisma.rideGridEvent.findMany({ where: { createdAt: { gte: since }, eventType: { in: [...new Set(automationRules.map(r => r.trigger))] } }, orderBy: { createdAt: "desc" }, take: 2000, select: { eventType: true, payload: true, createdAt: true } }),
    loadRuleOverrides(),
  ]);
  const rules = automationRules.map(r => {
    const enabled = isRuleEnabled(r, overrides);
    let executed = 0, failures = 0, lastRunAt: Date | null = null, lastError: string | null = null, latestFailed = false;
    for (const e of recent) {
      if (e.eventType !== r.trigger) continue;
      const run = storedAutomation(e.payload);
      if (!run) continue;
      const failure = run.failed.find(f => f.ruleId === r.id);
      if (failure) failures++;
      else if (run.completed.includes(r.id)) executed++;
      else continue;
      if (!lastRunAt) { lastRunAt = e.createdAt; latestFailed = !!failure; lastError = failure?.error ?? null; }
    }
    const requires = ruleRequirement(r);
    const status: AutomationRuntimeStatus = requires ? "NOT_CONFIGURED" : !enabled ? "DISABLED" : latestFailed ? "FAILED" : "ACTIVE";
    return {
      id: r.id, name: r.name, description: r.description, trigger: r.trigger, action: r.action, recipient: r.recipient ?? null,
      channel: CHANNEL[r.action] ?? "Scheduled job",
      status, enabled, requires, executed30d: executed, failed30d: failures, lastRunAt, lastError,
    };
  });
  const triggers = new Set<string>(WORKFLOWS.map(w => w.trigger));
  return {
    workflows: WORKFLOWS.map(w => ({
      ...w,
      rules: rules.filter(r => r.trigger === w.trigger && !r.requires).map(r => ({ id: r.id, name: r.name, status: r.status })),
      last30: stats.filter(s => s.eventType === w.trigger).reduce((acc, s) => ({ ...acc, [s.status]: s._count._all }), {} as Record<string, number>),
    })),
    otherEvents: stats.filter(s => !triggers.has(s.eventType)).map(s => ({ eventType: s.eventType, status: s.status, count: s._count._all })),
    failed, retry: retry.map(r => ({ status: r.status, count: r._count._all })),
    rules,
  };
}

export async function setAutomationRuleEnabled(id: string, enabled: boolean, actorId: string) {
  const rule = getAutomationRuleById(id);
  if (!rule) throw new AccountLifecycleError(404, "Automation rule not found.");
  const requires = ruleRequirement(rule);
  if (requires) throw new AccountLifecycleError(409, `This rule cannot run yet: ${requires}.`);
  await setRuleEnabled(id, enabled);
  await audit(prisma, { actorId, action: AuditAction.UPDATE, entityName: "AutomationRule", entityId: id, newValue: { event: enabled ? "AUTOMATION_ENABLED" : "AUTOMATION_DISABLED" } });
  return { id, enabled };
}

export async function runRetryQueue(actorId: string) {
  const result = await processRetryQueue();
  await audit(prisma, { actorId, action: AuditAction.UPDATE, entityName: "EventRetryQueue", entityId: "manual-run", newValue: { event: "RETRY_QUEUE_PROCESSED", ...result } });
  return result;
}

export async function securityView(f: { entity?: string; action?: string; page?: number }) {
  const page = Math.max(f.page || 1, 1), pageSize = 30;
  const where: Prisma.AuditLogWhereInput = {
    ...(f.entity ? { entityName: f.entity } : {}),
    ...(f.action && Object.values(AuditAction).includes(f.action as AuditAction) ? { action: f.action as AuditAction } : {}),
  };
  const since = addDays(new Date(), -30);
  const [users, total, audits, entities, failedLogins, logins, liveSessions, sensitive] = await Promise.all([
    prisma.user.groupBy({ by: ["role", "isActive"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, action: true, entityName: true, entityId: true, newValue: true, ipAddress: true, createdAt: true, user: { select: { name: true, role: true } } } }),
    prisma.auditLog.groupBy({ by: ["entityName"], _count: { _all: true }, orderBy: { _count: { entityName: "desc" } }, take: 30 }),
    prisma.securityEvent.count({ where: { eventType: "LOGIN_FAILED", createdAt: { gte: since } } }),
    prisma.loginHistory.count({ where: { loginTime: { gte: since } } }),
    prisma.refreshToken.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.count({ where: { action: AuditAction.DELETE, createdAt: { gte: since } } }),
  ]);
  const deleted = await prisma.user.groupBy({ by: ["role"], where: { deletedAt: { not: null } }, _count: { _all: true } });
  const roles = [...new Set([...users.map(u => u.role), ...deleted.map(d => d.role)])];
  return {
    usersByRole: roles.map(role => ({ role, active: users.find(u => u.role === role && u.isActive)?._count._all ?? 0, suspended: users.find(u => u.role === role && !u.isActive)?._count._all ?? 0, deleted: deleted.find(d => d.role === role)?._count._all ?? 0 })),
    rbac: rolePermissionMatrix(),
    signals: { failedLogins30d: failedLogins, loginsRecorded30d: logins, activeRefreshSessions: liveSessions, deletions30d: sensitive },
    audit: { rows: audits, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)), entities: entities.map(e => e.entityName) },
  };
}

export function aiView() {
  const provider = process.env.AI_PROVIDER || null;
  const textAi = configured("AI_API_KEY") && !!provider;
  const imageAi = configured("OPENAI_API_KEY");
  return {
    textAi: { configured: textAi, provider: textAi ? provider : null, model: textAi ? process.env.AI_MODEL || null : null },
    imageAi: { configured: imageAi },
    capabilities: [
      { name: "Website & SEO content drafting", kind: "AI", status: textAi ? "ACTIVE" : "NOT_CONFIGURED", note: "Uses the configured text AI provider." },
      { name: "Website image generation", kind: "AI", status: imageAi ? "ACTIVE" : "NOT_CONFIGURED", note: "Generates images for website pages; requires an image provider key." },
      { name: "Travel policy decisions", kind: "RULES", status: "ACTIVE", note: "Deterministic company policy and limit checks — not AI." },
      { name: "Marketplace availability & pricing", kind: "RULES", status: "ACTIVE", note: "Deterministic availability windows and versioned pricing — not AI." },
      { name: "Smart Return suggestions", kind: "RULES", status: "ACTIVE", note: "Rule-based return-trip matching — not AI." },
    ],
  };
}
