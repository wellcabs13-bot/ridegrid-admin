// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// In-memory Prisma stand-in covering the models these services touch.
const db = vi.hoisted(() => {
  const state: Record<string, any[]> = {};
  const reset = () => { for (const k of ["user", "customer", "vendor", "booking", "transaction", "corporateWallet", "corporateWalletTransaction", "bookingStatusHistory", "trip", "auditLog", "refreshToken", "notification", "corporateEmployee"]) state[k] = []; };
  reset();
  const match = (row: any, where: any = {}): boolean => Object.entries(where).every(([k, v]: [string, any]) => {
    if (k === "OR") return (v as any[]).some(w => match(row, w));
    if (k === "AND") return (v as any[]).every(w => match(row, w));
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("in" in v) return v.in.includes(row[k]);
      if ("not" in v) return v.not === null ? row[k] != null : row[k] !== v.not;
      if ("gte" in v || "gt" in v || "lte" in v || "lt" in v) return row[k] != null;
      if ("endsWith" in v) return String(row[k]).endsWith(v.endsWith);
      return true; // relation filters are not modelled
    }
    return row[k] === v;
  });
  const model = (name: string) => ({
    findUnique: vi.fn(async ({ where }: any) => state[name].find(r => match(r, where)) ?? null),
    findUniqueOrThrow: vi.fn(async ({ where }: any) => { const r = state[name].find(x => match(x, where)); if (!r) throw new Error("nf"); return r; }),
    findFirst: vi.fn(async ({ where }: any = {}) => state[name].find(r => match(r, where)) ?? null),
    findMany: vi.fn(async ({ where }: any = {}) => state[name].filter(r => match(r, where))),
    count: vi.fn(async ({ where }: any = {}) => state[name].filter(r => match(r, where)).length),
    create: vi.fn(async ({ data }: any) => { const row = { id: `${name}-${state[name].length + 1}`, ...data }; state[name].push(row); return row; }),
    update: vi.fn(async ({ where, data }: any) => { const r = state[name].find(x => match(x, where)); if (!r) throw new Error("nf"); Object.assign(r, data); return r; }),
    updateMany: vi.fn(async ({ where, data }: any) => { const rows = state[name].filter(x => match(x, where)); rows.forEach(r => Object.assign(r, data)); return { count: rows.length }; }),
  });
  const client: any = {};
  for (const k of Object.keys(state)) client[k] = model(k);
  client.$transaction = vi.fn(async (fn: any) => fn(client));
  return { state, client, reset };
});

vi.mock("@/lib/prisma", () => ({ prisma: db.client }));
const events = vi.hoisted(() => ({ emitRideGridEvent: vi.fn(async (_input: { type: string; [k: string]: unknown }) => ({})) }));
vi.mock("@/lib/events/event-dispatcher", () => ({ dispatchRideGridEvent: vi.fn(async () => ({})), emitRideGridEvent: events.emitRideGridEvent }));

const access = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/request-access", async () => {
  const actual = await vi.importActual<any>("@/lib/request-access");
  return { ...actual, requestUser: vi.fn(async () => access.user) };
});
const employee = vi.hoisted(() => ({ writeEmployee: vi.fn() }));
vi.mock("@/lib/corporate-employee-mobile/write", () => ({ writeEmployee: employee.writeEmployee }));

import { POST as bookingPOST } from "@/app/api/marketplace/cash-booking/route";
import { GET as mobileConfig } from "@/app/api/mobile/config/route";
import { deleteCustomer, setVendorSuspended, tombstoneEmail, verifyVendor } from "@/lib/services/admin/AccountLifecycleService";
import { cancelBooking } from "@/lib/services/admin/BookingAdminService";
import { CorporateMobileError } from "@/lib/corporate-employee-mobile/access";
import { parseRange } from "@/lib/services/admin/metrics";

const post = (body: unknown) => new NextRequest("http://localhost/api/marketplace/cash-booking", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const PAYU = ["PAYU_MERCHANT_KEY", "PAYU_MERCHANT_SALT", "PAYU_PAYMENT_URL", "PAYU_VERIFY_URL"];

beforeEach(() => { db.reset(); access.user = null; employee.writeEmployee.mockReset(); events.emitRideGridEvent.mockClear(); for (const k of PAYU) delete process.env[k]; });

describe("retail payment is PayU only", () => {
  it("rejects Cash for retail bookings", async () => {
    for (const k of PAYU) process.env[k] = "x";
    const res = await bookingPOST(post({ paymentMethod: "CASH", quoteId: "q" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/PayU/);
  });
  it("refuses (503) instead of falling back when PayU is not configured", async () => {
    const res = await bookingPOST(post({ paymentMethod: "PAYU", quoteId: "q" }));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("ONLINE_PAYMENT_UNAVAILABLE");
  });
  it("mobile config never advertises Cash", async () => {
    const off = await (await mobileConfig()).json();
    expect(off.data.paymentMethods).toEqual([]);
    for (const k of PAYU) process.env[k] = "x";
    const on = await (await mobileConfig()).json();
    expect(on.data.paymentMethods).toEqual(["ONLINE"]);
  });
});

describe("corporate marketplace bookings use the employee policy/approval pipeline", () => {
  it("requires a company traveller login (admins cannot bypass policy)", async () => {
    access.user = { id: "u-admin", name: "Admin", role: "SUPER_ADMIN" };
    const res = await bookingPOST(post({ corporateId: "c1", paymentMethod: "CORPORATE_CREDIT" }));
    expect(res.status).toBe(403);
    expect(employee.writeEmployee).not.toHaveBeenCalled();
  });
  it("surfaces APPROVAL_REQUIRED and never confirms a booking", async () => {
    access.user = { id: "u1", name: "Emp", role: "CORPORATE_EMPLOYEE" };
    db.state.corporateEmployee.push({ id: "e1", userId: "u1", corporateId: "c1", isActive: true, corporate: { status: "ACTIVE", deletedAt: null } });
    employee.writeEmployee.mockRejectedValueOnce(new CorporateMobileError(409, "Needs approval", "APPROVAL_REQUIRED"));
    const res = await bookingPOST(post({ corporateId: "c1", quoteId: "q", listingId: "v", pricingPackageId: "p", pickupDateTime: "2030-01-01T10:00:00.000Z", pickupAddress: "A", dropAddress: "B" }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("APPROVAL_REQUIRED");
    expect(employee.writeEmployee).toHaveBeenCalledWith("book", expect.any(Object), expect.objectContaining({ employee: expect.objectContaining({ id: "e1" }) }));
  });
  it("submits an approval request when asked", async () => {
    access.user = { id: "u1", name: "Emp", role: "CORPORATE_EMPLOYEE" };
    db.state.corporateEmployee.push({ id: "e1", userId: "u1", corporateId: "c1", isActive: true, corporate: { status: "ACTIVE", deletedAt: null } });
    employee.writeEmployee.mockResolvedValueOnce({ id: "ar1", status: "PENDING" });
    const res = await bookingPOST(post({ corporateId: "c1", requestApproval: true, quoteId: "q" }));
    const body = await res.json();
    expect(body.data.approvalRequested).toBe(true);
    expect(employee.writeEmployee).toHaveBeenCalledWith("approvals", expect.any(Object), expect.any(Object));
  });
});

describe("account deletion releases identity and keeps history", () => {
  it("tombstones email/mobile, disables login, keeps bookings", async () => {
    db.state.user.push({ id: "u1", email: "a@b.com", mobile: "9999999999", role: "CUSTOMER", isActive: true, deletedAt: null });
    db.state.customer.push({ id: "c1", userId: "u1", deletedAt: null, user: { role: "CUSTOMER" } });
    db.state.booking.push({ id: "b1", customerId: "c1", status: "TRIP_COMPLETED", deletedAt: null });
    await deleteCustomer("c1", "admin", "requested");
    const u = db.state.user[0];
    expect(u.email).toBe(tombstoneEmail("u1"));
    expect(u.mobile).toBeNull();
    expect(u.isActive).toBe(false);
    expect(db.state.customer[0].deletedAt).toBeInstanceOf(Date);
    expect(db.state.booking).toHaveLength(1);
    expect(db.state.auditLog[0].action).toBe("DELETE");
  });
  it("blocks deletion while a future booking is open", async () => {
    db.state.user.push({ id: "u1", email: "a@b.com", role: "CUSTOMER", isActive: true });
    db.state.customer.push({ id: "c1", userId: "u1", deletedAt: null, user: { role: "CUSTOMER" } });
    db.state.booking.push({ id: "b1", bookingNumber: "WC1", customerId: "c1", status: "CONFIRMED", deletedAt: null, reservedUntil: new Date(Date.now() + 86400000) });
    await expect(deleteCustomer("c1", "admin", "x")).rejects.toThrow(/WC1/);
    expect(db.state.user[0].email).toBe("a@b.com");
  });
});

describe("vendor verification and suspension", () => {
  it("verify sets the marketplace gate and a verified date", async () => {
    db.state.vendor.push({ id: "v1", userId: "u1", isApproved: false, deletedAt: null });
    await verifyVendor("v1", true, "admin");
    expect(db.state.vendor[0]).toMatchObject({ isApproved: true });
    expect(db.state.vendor[0].verifiedAt).toBeInstanceOf(Date);
  });
  it("suspension requires a reason, blocks login and reports open commitments", async () => {
    db.state.vendor.push({ id: "v1", userId: "u1", isApproved: true, deletedAt: null });
    db.state.user.push({ id: "u1", isActive: true });
    await expect(setVendorSuspended("v1", true, "admin", "")).rejects.toThrow(/reason/);
    db.state.booking.push({ id: "b1", bookingNumber: "WC9", vendorId: "v1", status: "CONFIRMED", deletedAt: null, reservedUntil: new Date(Date.now() + 86400000) });
    const open = await setVendorSuspended("v1", true, "admin", "Documents expired");
    expect(db.state.vendor[0].suspendedAt).toBeInstanceOf(Date);
    expect(db.state.user[0].isActive).toBe(false);
    expect(open.map(b => b.bookingNumber)).toEqual(["WC9"]);
    expect(db.state.booking[0].status).toBe("CONFIRMED");
  });
});

describe("central cancellation", () => {
  const booking = (extra: any = {}) => ({ id: "b1", bookingNumber: "WC1", status: "CONFIRMED", deletedAt: null, corporateId: null, vendorId: "v1", finalFare: 1000, estimatedFare: 1000, ...extra });
  it("restores corporate credit and records a paid corporate refund", async () => {
    db.state.booking.push(booking({ corporateId: "c1", customer: { userId: "u" } }));
    db.state.transaction.push({ id: "t1", bookingId: "b1", transactionType: "BOOKING_PAYMENT", paymentMethod: "CORPORATE_CREDIT", paymentStatus: "PAID", amount: 1000 });
    db.state.corporateWallet.push({ id: "w1", corporateId: "c1", balance: 1500 });
    db.client.booking.findUnique.mockImplementationOnce(async () => ({ ...db.state.booking[0], transactions: db.state.transaction.filter(t => t.transactionType === "BOOKING_PAYMENT") }));
    const r = await cancelBooking("b1", "admin", "Customer request");
    expect(r.refundState).toBe("CORPORATE_CREDIT_RESTORED");
    expect(db.state.corporateWallet[0].balance).toBe(500);
    expect(db.state.transaction.find(t => t.transactionType === "REFUND")).toMatchObject({ paymentStatus: "PAID", paymentMethod: "CORPORATE_CREDIT", amount: 1000 });
    expect(db.state.booking[0].status).toBe("CANCELLED");
    expect(db.state.bookingStatusHistory[0]).toMatchObject({ previousStatus: "CONFIRMED", currentStatus: "CANCELLED", changedBy: "admin" });
    // Central BOOKING_CANCELLED event (automation notifications); no refund is due.
    expect(events.emitRideGridEvent.mock.calls.map(c => c[0].type)).toEqual(["BOOKING_CANCELLED"]);
    expect(events.emitRideGridEvent.mock.calls[0][0]).toMatchObject({ bookingId: "b1", userId: "u", vendorId: "v1", metadata: expect.objectContaining({ refundState: "CORPORATE_CREDIT_RESTORED", bookingNumber: "WC1" }) });
  });
  it("records a PayU refund as due (never as paid) and voids unpaid attempts", async () => {
    db.state.booking.push(booking({ customer: { userId: "u" }, customerId: "c1" }));
    db.state.transaction.push({ id: "t1", bookingId: "b1", transactionType: "BOOKING_PAYMENT", paymentMethod: "UPI", paymentStatus: "PAID", amount: 1000 });
    db.client.booking.findUnique.mockImplementationOnce(async () => ({ ...db.state.booking[0], transactions: [...db.state.transaction] }));
    const r = await cancelBooking("b1", "admin", "Vehicle breakdown");
    expect(r.refundState).toBe("REFUND_DUE");
    expect(db.state.transaction.find(t => t.transactionType === "REFUND")).toMatchObject({ paymentStatus: "PENDING", gatewayName: "PAYU" });
    // Cancellation plus a REFUND_DUE event for the Finance alert rule.
    expect(events.emitRideGridEvent.mock.calls.map(c => c[0].type)).toEqual(["BOOKING_CANCELLED", "REFUND_DUE"]);
    expect(events.emitRideGridEvent.mock.calls[1][0]).toMatchObject({ module: "FINANCE", metadata: expect.objectContaining({ refundAmount: 1000 }) });
  });
  it("rejects cancelling a completed trip", async () => {
    db.state.booking.push(booking({ status: "TRIP_COMPLETED" }));
    db.client.booking.findUnique.mockImplementationOnce(async () => ({ ...db.state.booking[0], transactions: [] }));
    await expect(cancelBooking("b1", "admin", "x")).rejects.toThrow(/already/);
    expect(events.emitRideGridEvent).not.toHaveBeenCalled();
  });
  it("requires a reason", async () => {
    await expect(cancelBooking("b1", "admin", " ")).rejects.toThrow(/reason/);
  });
});

describe("IST date ranges", () => {
  it("treats date-only filters as IST days, with an exclusive end", () => {
    const r = parseRange(new URLSearchParams({ from: "2026-09-01", to: "2026-09-30" }));
    expect(r.from?.toISOString()).toBe("2026-08-31T18:30:00.000Z");
    expect(r.to?.toISOString()).toBe("2026-09-30T18:30:00.000Z");
  });
});
