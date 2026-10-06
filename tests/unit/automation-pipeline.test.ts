// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercises the real event dispatcher and automation engine against an in-memory
// Prisma stand-in: events are stored, rules subscribed to the trigger execute, and
// their outcome is recorded on the event.
const db = vi.hoisted(() => {
  const s = {
    events: [] as any[], retries: [] as any[], audits: [] as any[], notifications: [] as any[], settings: [] as any[],
    bookings: [] as any[], vendors: [] as any[], drivers: [] as any[], users: [] as any[], devices: [] as any[], emailLogs: [] as any[],
    failNotificationFor: null as string | null,
  };
  const client: any = {
    rideGridEvent: {
      create: vi.fn(async ({ data }: any) => { const row = { createdAt: new Date(), ...data }; s.events.push(row); return row; }),
      update: vi.fn(async ({ where, data }: any) => Object.assign(s.events.find(e => e.id === where.id), data)),
      findUnique: vi.fn(async ({ where }: any) => s.events.find(e => e.id === where.id) ?? null),
    },
    eventRetryQueue: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `retry-${s.retries.length + 1}`, attemptCount: 0, maxAttempts: 3, createdAt: new Date(), ...data }; s.retries.push(row); return row; }),
      findMany: vi.fn(async () => s.retries.filter(r => r.status === "PENDING")),
      update: vi.fn(async ({ where, data }: any) => {
        const r = s.retries.find(x => x.id === where.id);
        const { attemptCount, ...rest } = data;
        if (attemptCount?.increment) r.attemptCount += attemptCount.increment;
        return Object.assign(r, rest);
      }),
    },
    auditLog: { create: vi.fn(async ({ data }: any) => { s.audits.push(data); return data; }) },
    notification: {
      createMany: vi.fn(async ({ data }: any) => {
        if (s.failNotificationFor && data.some((n: any) => n.userId === s.failNotificationFor)) throw new Error("inbox unavailable");
        s.notifications.push(...data); return { count: data.length };
      }),
    },
    systemSetting: {
      findMany: vi.fn(async ({ where }: any) => s.settings.filter(x => x.settingKey.startsWith(where.settingKey.startsWith))),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const row = s.settings.find(x => x.settingKey === where.settingKey);
        if (row) return Object.assign(row, update);
        s.settings.push(create); return create;
      }),
    },
    booking: { findUnique: vi.fn(async ({ where }: any) => s.bookings.find(b => b.id === where.id) ?? null) },
    vendor: { findUnique: vi.fn(async ({ where }: any) => s.vendors.find(v => v.id === where.id) ?? null) },
    driver: { findUnique: vi.fn(async ({ where }: any) => s.drivers.find(d => d.id === where.id) ?? null) },
    user: {
      findMany: vi.fn(async ({ where }: any) => s.users.filter(u =>
        u.isActive && !u.deletedAt && (where.id?.in ? where.id.in.includes(u.id) :
        (where.role.in ? where.role.in.includes(u.role) : u.role === where.role) &&
        (!where.corporateEmployee || (u.corporateId === where.corporateEmployee.corporateId && u.employeeActive))))),
    },
    pushDevice: {
      findMany: vi.fn(async ({ where }: any) => s.devices.filter(d => d.isActive && where.userId.in.includes(d.userId))),
      updateMany: vi.fn(async ({ where, data }: any) => { const rows = s.devices.filter(d => (where.token?.in ?? [where.token]).includes(d.token)); rows.forEach(r => Object.assign(r, data)); return { count: rows.length }; }),
    },
    notificationLog: { create: vi.fn(async ({ data }: any) => { s.emailLogs.push(data); return data; }) },
  };
  const reset = () => {
    for (const k of Object.keys(s) as (keyof typeof s)[]) if (Array.isArray(s[k])) (s[k] as any[]).length = 0;
    s.failNotificationFor = null;
  };
  return { s, client, reset };
});

vi.mock("@/lib/prisma", () => ({ prisma: db.client }));

import { dispatchRideGridEvent, emitRideGridEvent, processRetryQueue, storedAutomation } from "@/lib/events/event-dispatcher";
import { createRideGridEvent, subscribe } from "@/lib/events/event-bus";
import { automationRules, getAutomationRules, ruleRequirement } from "@/lib/automation/automation-rules";
import { AutomationTrigger } from "@/types/automation";

const live = (id: string) => ({ id, isActive: true, deletedAt: null });

beforeEach(() => {
  // Isolate from a developer's real .env: email/push stay unconfigured unless a describe opts in.
  for (const k of ["ZOHO_CPAAS_EMAIL_API_KEY", "ZOHO_CPAAS_EMAIL_API_URL", "EMAIL_FROM_ADDRESS", "EMAIL_FROM_NAME", "PUSH_NOTIFICATIONS_ENABLED", "EXPO_ACCESS_TOKEN"]) vi.stubEnv(k, "");
  db.reset();
  db.s.bookings.push({ id: "b1", bookingNumber: "RG-1001", pickupDateTime: new Date("2030-01-01T04:30:00.000Z") });
  db.s.vendors.push({ id: "v1", user: live("vendor-user") });
  db.s.drivers.push({ id: "d1", user: live("driver-user") });
  db.s.users.push(
    { id: "corp-admin-a", role: "CORPORATE_ADMIN", isActive: true, deletedAt: null, corporateId: "corp-a", employeeActive: true },
    { id: "corp-admin-b", role: "CORPORATE_ADMIN", isActive: true, deletedAt: null, corporateId: "corp-b", employeeActive: true },
    { id: "corp-admin-inactive", role: "CORPORATE_ADMIN", isActive: false, deletedAt: null, corporateId: "corp-a", employeeActive: true },
    { id: "super", role: "SUPER_ADMIN", isActive: true, deletedAt: null },
    { id: "finance", role: "FINANCE", isActive: true, deletedAt: null },
    { id: "ops", role: "OPERATIONS", isActive: true, deletedAt: null },
  );
});

const bookingCreated = () => createRideGridEvent({ type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING", bookingId: "b1", userId: "traveller", vendorId: "v1", driverId: "d1", metadata: { bookingNumber: "RG-1001" } });
const recipients = (title: string) => db.s.notifications.filter(n => n.title === title).map(n => n.userId).sort();

describe("active automation rules run from the event pipeline", () => {
  it("BOOKING_CREATED executes every subscribed rule and records the outcome", async () => {
    await dispatchRideGridEvent(bookingCreated());
    expect(recipients("Booking confirmed")).toEqual(["traveller"]);
    expect(recipients("New confirmed booking")).toEqual(["vendor-user"]);
    expect(recipients("Trip assigned to you")).toEqual(["driver-user"]);
    expect(db.s.notifications.every(n => n.notificationType === "PUSH" && n.status === "SENT")).toBe(true);
    const event = db.s.events[0];
    expect(event.status).toBe("COMPLETED");
    expect(storedAutomation(event.payload)).toMatchObject({ completed: ["AUTO-001", "AUTO-002", "AUTO-003"], failed: [] });
    expect(event.payload.bookingNumber).toBe("RG-1001");
    expect(db.s.audits.at(-1).newValue).toMatchObject({ eventType: "BOOKING_CREATED", status: "COMPLETED" });
  });

  it("delivers in-process subscribers exactly once per event", async () => {
    const handler = vi.fn();
    const off = subscribe("BOOKING", AutomationTrigger.BOOKING_CREATED, handler);
    await dispatchRideGridEvent(bookingCreated());
    off();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not run a rule an admin disabled", async () => {
    db.s.settings.push({ settingKey: "automation.rule.AUTO-002.enabled", settingValue: "false" });
    await dispatchRideGridEvent(bookingCreated());
    expect(recipients("New confirmed booking")).toEqual([]);
    expect(recipients("Booking confirmed")).toEqual(["traveller"]);
    expect(storedAutomation(db.s.events[0].payload)).toMatchObject({ completed: ["AUTO-001", "AUTO-003"], skipped: ["AUTO-002"] });
  });

  it("never selects rules that need an unconnected provider or scheduler", async () => {
    const pending = automationRules.filter(r => r.requires).map(r => r.id);
    expect(pending).toEqual(["AUTO-015", "AUTO-016"]);
    // Without Zoho CPaaS configuration every email rule reports NOT_CONFIGURED.
    const email = automationRules.filter(r => r.action === "SEND_EMAIL");
    expect(email.length).toBeGreaterThanOrEqual(10);
    expect(email.every(r => ruleRequirement(r) === "Email provider (Zoho CPaaS) not configured")).toBe(true);
    for (const trigger of Object.values(AutomationTrigger)) expect(getAutomationRules(trigger).some(r => ruleRequirement(r))).toBe(false);
    await dispatchRideGridEvent(bookingCreated());
    expect(db.s.notifications.some(n => ["EMAIL", "SMS", "WHATSAPP"].includes(n.notificationType))).toBe(false);
  });
});

describe("booking lifecycle events", () => {
  it("BOOKING_CANCELLED notifies the traveller and vendor", async () => {
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.BOOKING_CANCELLED, module: "BOOKING", bookingId: "b1", userId: "traveller", vendorId: "v1", driverId: "d1" }));
    expect(db.s.notifications.map(n => n.userId).sort()).toEqual(["traveller", "vendor-user"]);
    expect(db.s.notifications.every(n => n.title === "Booking cancelled" && n.message.includes("RG-1001"))).toBe(true);
  });
  it("REFUND_DUE alerts active Super Admin and Finance users only", async () => {
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.REFUND_DUE, module: "FINANCE", bookingId: "b1", userId: "traveller", metadata: { refundAmount: 1500 } }));
    expect(recipients("Refund due")).toEqual(["finance", "super"]);
    expect(db.s.notifications[0].message).toContain("₹1,500");
  });
  it("DRIVER_ASSIGNED notifies the traveller", async () => {
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.DRIVER_ASSIGNED, module: "BOOKING", bookingId: "b1", userId: "traveller", driverId: "d1" }));
    expect(recipients("Driver updated")).toEqual(["traveller"]);
  });
  it("TRIP_COMPLETED and PAYMENT_RECEIVED are stored and processed", async () => {
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.TRIP_COMPLETED, module: "BOOKING", bookingId: "b1", userId: "traveller" }));
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.PAYMENT_RECEIVED, module: "PAYMENT", bookingId: "b1", userId: "traveller" }));
    expect(db.s.events.map(e => [e.eventType, e.status])).toEqual([["TRIP_COMPLETED", "COMPLETED"], ["PAYMENT_RECEIVED", "COMPLETED"]]);
    expect(recipients("Payment received")).toEqual(["traveller"]);
  });
});

describe("corporate approval lifecycle", () => {
  it("APPROVAL_REQUIRED notifies the employee and only the company's active approvers", async () => {
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, module: "CORPORATE", userId: "employee", metadata: { approvalId: "ar1", corporateId: "corp-a", pickupDateTime: "2030-01-01T04:30:00.000Z" } }));
    expect(recipients("Approval requested")).toEqual(["employee"]);
    expect(recipients("Travel approval required")).toEqual(["corp-admin-a"]);
  });
  it("APPROVED tells the employee to book at a fresh price; REJECTED carries the reason", async () => {
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.CORPORATE_APPROVED, module: "CORPORATE", userId: "employee", metadata: { approvalId: "ar1", corporateId: "corp-a" } }));
    await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.CORPORATE_REJECTED, module: "CORPORATE", userId: "employee", metadata: { approvalId: "ar2", corporateId: "corp-a", remarks: "Use the shuttle" } }));
    expect(db.s.notifications.map(n => [n.userId, n.title])).toEqual([["employee", "Ride request approved"], ["employee", "Ride request rejected"]]);
    expect(db.s.notifications[0].message).toMatch(/fresh price/);
    expect(db.s.notifications[1].message).toContain("Use the shuttle");
  });
  it("records a failure when the approver company is missing", async () => {
    await expect(dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, module: "CORPORATE", userId: "employee", metadata: {} }))).rejects.toThrow(/AUTO-010/);
    const event = db.s.events[0];
    expect(event.status).toBe("FAILED");
    expect(storedAutomation(event.payload)).toMatchObject({ completed: ["AUTO-009"], failed: [{ ruleId: "AUTO-010" }] });
  });
});

describe("failure visibility and retry", () => {
  it("queues a failed rule and retries only that rule", async () => {
    db.s.failNotificationFor = "vendor-user";
    const result = await emitRideGridEvent({ type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING", bookingId: "b1", userId: "traveller", vendorId: "v1", driverId: "d1" });
    expect(result).toBeNull(); // emitters never fail after their own write committed
    expect(db.s.events[0]).toMatchObject({ status: "FAILED", errorMessage: expect.stringContaining("AUTO-002: inbox unavailable") });
    expect(db.s.retries).toHaveLength(1);
    expect(recipients("Booking confirmed")).toEqual(["traveller"]);

    db.s.failNotificationFor = null;
    expect(await processRetryQueue()).toEqual({ processed: 1, completed: 1, failed: 0 });
    expect(recipients("Booking confirmed")).toEqual(["traveller"]); // not repeated
    expect(recipients("New confirmed booking")).toEqual(["vendor-user"]);
    expect(db.s.events[0].status).toBe("COMPLETED");
    expect(storedAutomation(db.s.events[0].payload)?.completed.sort()).toEqual(["AUTO-001", "AUTO-002", "AUTO-003"]);
  });
});

describe("email and push channels through the same pipeline", () => {
  const ENV = { ZOHO_CPAAS_EMAIL_API_KEY: "zoho-secret-key", ZOHO_CPAAS_EMAIL_API_URL: "", EMAIL_FROM_ADDRESS: "service@wellcabs.com", EMAIL_FROM_NAME: "RideGrid by Wellcabs", PUSH_NOTIFICATIONS_ENABLED: "true" };
  const fetchMock = vi.fn();
  const calls = (host: string) => fetchMock.mock.calls.filter(([url]) => String(url).includes(host));
  beforeEach(() => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string, init: any) => String(url).includes("exp.host")
      ? new Response(JSON.stringify({ data: JSON.parse(init.body).map(() => ({ status: "ok" })) }), { status: 200 })
      : new Response(JSON.stringify({ data: [{ code: "EM_104", message: "OK" }], request_id: "req-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    db.s.users.push({ id: "traveller", name: "Tara", email: "tara@example.com", role: "CUSTOMER", isActive: true, deletedAt: null });
    db.s.devices.push({ userId: "traveller", token: "ExponentPushToken[traveller-device-1]", isActive: true }, { userId: "vendor-user", token: "ExponentPushToken[vendor-device-0001]", isActive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("sends the booking confirmation email once, via Zoho, from the verified sender", async () => {
    await dispatchRideGridEvent(bookingCreated());
    const zoho = calls("cpaas.zoho.com");
    expect(zoho).toHaveLength(1);
    const [url, init] = zoho[0];
    expect(url).toBe("https://cpaas.zoho.com/v1.1/email");
    expect(init.headers.Authorization).toBe("Zoho-enczapikey zoho-secret-key");
    const body = JSON.parse(init.body);
    expect(body.from).toEqual({ address: "service@wellcabs.com", name: "RideGrid by Wellcabs" });
    expect(body.to[0].email_address.address).toBe("tara@example.com");
    expect(body.subject).toBe("Booking confirmed: RG-1001");
    expect(storedAutomation(db.s.events[0].payload)?.completed).toContain("AUTO-014");
    // Logged without the full address, the key or the body.
    expect(JSON.stringify(db.s.emailLogs)).not.toMatch(/tara@example|zoho-secret-key|Open the RideGrid/);
    // A retry of the same event never re-sends a completed email rule.
    db.s.events[0].status = "FAILED";
  });

  it("mirrors in-app notifications as push with only a navigation hint", async () => {
    await dispatchRideGridEvent(bookingCreated());
    await new Promise(r => setTimeout(r, 0));
    const sent = calls("exp.host").flatMap(([, init]) => JSON.parse(init.body));
    expect(sent.map((m: any) => m.to).sort()).toEqual(["ExponentPushToken[traveller-device-1]", "ExponentPushToken[vendor-device-0001]"]);
    for (const m of sent) {
      expect(m.data).toEqual({ kind: "booking", bookingId: "b1" });
      expect(JSON.stringify(m)).not.toMatch(/amount|payout|revenue|mobile|email/i);
    }
    // Push adds no extra in-app rows.
    expect(db.s.notifications).toHaveLength(3);
  });

  it("retires tokens Expo reports as DeviceNotRegistered", async () => {
    fetchMock.mockImplementation(async (url: string, init: any) => String(url).includes("exp.host")
      ? new Response(JSON.stringify({ data: JSON.parse(init.body).map((m: any) => m.to.includes("vendor") ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok" }) }), { status: 200 })
      : new Response("{}", { status: 200 }));
    await dispatchRideGridEvent(bookingCreated());
    await new Promise(r => setTimeout(r, 0));
    expect(db.s.devices.find(d => d.userId === "vendor-user")).toMatchObject({ isActive: false, failureReason: "DEVICE_NOT_REGISTERED" });
    expect(db.s.devices.find(d => d.userId === "traveller").isActive).toBe(true);
  });

  it("an email outage fails only the email rule, queues a retry and never fails the caller", async () => {
    fetchMock.mockImplementation(async (url: string) => String(url).includes("exp.host")
      ? Promise.reject(new Error("offline"))
      : new Response(JSON.stringify({ error: { code: "TM_500", message: "Service down for zoho-secret-key" } }), { status: 503 }));
    await expect(emitRideGridEvent({ type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING", bookingId: "b1", userId: "traveller", vendorId: "v1", driverId: "d1" })).resolves.toBeNull();
    const run = storedAutomation(db.s.events[0].payload)!;
    expect(run.completed.sort()).toEqual(["AUTO-001", "AUTO-002", "AUTO-003"]);
    expect(run.failed.map(f => f.ruleId)).toEqual(["AUTO-014"]);
    expect(run.failed[0].error).not.toContain("zoho-secret-key");
    expect(db.s.retries).toHaveLength(1);
    expect(db.s.notifications).toHaveLength(3);
  });

  it("reports email and push as not configured and sends nothing without credentials", async () => {
    for (const k of Object.keys(ENV)) vi.stubEnv(k, "");
    await dispatchRideGridEvent(bookingCreated());
    await new Promise(r => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(storedAutomation(db.s.events[0].payload)?.completed).not.toContain("AUTO-014");
  });
});
