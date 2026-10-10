// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const m = vi.hoisted(() => ({
  corporateEmployee: { findFirst: vi.fn(), findMany: vi.fn() },
  corporateTravelPolicy: { findFirst: vi.fn(), findMany: vi.fn() },
  corporateBudget: { findMany: vi.fn() },
  corporateApprovalRule: { findMany: vi.fn() },
  corporateApprovalRequest: { findFirst: vi.fn(), findMany: vi.fn() },
  booking: { findFirst: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
  pricingQuote: { findUnique: vi.fn() },
  corporateBookingTraveller: { update: vi.fn() },
  $transaction: vi.fn(),
  emitRideGridEvent: vi.fn(),
  readEmployee: vi.fn(async () => ({ ok: true })),
  writeEmployee: vi.fn(async () => ({ id: "booking-1", bookingNumber: "RG1001", status: "CONFIRMED" })),
  send: vi.fn(),
  logEmailResult: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
vi.mock("@/lib/events/event-dispatcher", () => ({ emitRideGridEvent: m.emitRideGridEvent, dispatchRideGridEvent: vi.fn() }));
vi.mock("@/lib/notifications/email", () => ({ emailProvider: { send: m.send }, logEmailResult: m.logEmailResult }));

const realWrite = vi.hoisted(() => ({ fn: null as null | ((s: string, b: Record<string, unknown>, a: unknown) => Promise<unknown>) }));

import { adminBookingWrite, adminBookingRead, parseGuest, parseTraveller } from "@/lib/corporate-admin/booking";
import { CorporateAdminError } from "@/lib/corporate-admin/access";
import { NextRequest } from "next/server";

vi.mock("@/lib/corporate-employee-mobile/read", async (orig) => ({ ...(await orig<object>()), readEmployee: m.readEmployee }));
vi.mock("@/lib/corporate-employee-mobile/write", async (orig) => {
  const actual = await orig<{ writeEmployee: (s: string, b: Record<string, unknown>, a: unknown) => Promise<unknown> }>();
  realWrite.fn = actual.writeEmployee;
  return { ...actual, writeEmployee: m.writeEmployee };
});

const admin = { user: { id: "admin-user", name: "Ava Admin" }, corporateId: "corp-a", adminEmployeeId: "emp-admin", company: { id: "corp-a", companyName: "Acme", status: "ACTIVE" } };
const person = (over: Record<string, unknown> = {}) => ({
  id: "emp-1", corporateId: "corp-a", userId: "user-1", isActive: true, canBook: true, branchId: "br-1", departmentId: "dep-1", travelPolicyId: "pol-1", employeeName: "Rahul Mehta",
  employeeCode: "E1", officialEmail: "rahul@acme.test", mobile: "9000000000", designation: "Manager", employeeGrade: null, managerName: null, isApprover: false,
  monthlyTravelLimit: new Prisma.Decimal(10000), yearlyTravelLimit: null, defaultPickupAddress: null, branch: null, department: null, costCenter: null,
  corporate: { id: "corp-a", companyName: "Acme", status: "ACTIVE", deletedAt: null, approvalFlow: "MANAGER", billingCycle: "MONTHLY" }, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.writeEmployee.mockResolvedValue({ id: "booking-1", bookingNumber: "RG1001", status: "CONFIRMED" });
  m.corporateEmployee.findFirst.mockImplementation(async (args: { where: { id: string; corporateId: string } }) =>
    args.where.corporateId !== "corp-a" ? null : args.where.id === "emp-admin" ? person({ id: "emp-admin", userId: "admin-user", employeeName: "Ava Admin", travelPolicyId: "pol-admin", departmentId: "dep-x", branchId: "br-x" }) : args.where.id === "emp-1" ? person() : args.where.id === "emp-nologin" ? person({ id: "emp-nologin", userId: null }) : args.where.id === "emp-off" ? person({ id: "emp-off", isActive: false }) : null);
  m.corporateBookingTraveller.update.mockResolvedValue({});
  m.booking.findUnique.mockResolvedValue({ bookingNumber: "RG1001", status: "CONFIRMED", pickupDateTime: new Date("2030-01-01T06:30:00Z"), pickupLocation: "Office", dropLocation: "Airport", vehicle: { make: "Toyota", model: "Innova", registrationNumber: "KA01AB1234" }, driver: { firstName: "Ramesh", lastName: "Kumar" }, vendor: { companyName: "Vendor Co" } });
  m.send.mockResolvedValue({ status: "SENT", providerRequestId: null });
});

describe("portal traveller parsing", () => {
  it("defaults to the administrator's own profile", () => { expect(parseTraveller(undefined)).toEqual({ kind: "SELF" }); });
  it("requires an employee id for employee bookings and rejects unknown kinds", () => {
    expect(() => parseTraveller({ kind: "EMPLOYEE" })).toThrow(CorporateAdminError);
    expect(() => parseTraveller({ kind: "ADMIN" })).toThrow(CorporateAdminError);
    expect(parseTraveller({ kind: "EMPLOYEE", employeeId: "emp-1" })).toEqual({ kind: "EMPLOYEE", employeeId: "emp-1" });
  });
  it("normalises Indian guest mobiles and validates required guest fields", () => {
    expect(parseGuest({ name: " John Carter ", mobile: "+91 98765 43210", email: "John@ABC.com" })).toEqual({ name: "John Carter", mobile: "9876543210", email: "john@abc.com", reference: null });
    expect(() => parseGuest({ name: "J", mobile: "9876543210" })).toThrow(/full name/);
    expect(() => parseGuest({ name: "John", mobile: "12345" })).toThrow(/mobile/);
    expect(() => parseGuest({ name: "John", mobile: "9876543210", email: "nope" })).toThrow(/email/);
  });
});

describe("booking for an employee", () => {
  it("books as the employee (their quote, policy and Customer) while recording the administrator", async () => {
    await adminBookingWrite("booking-book", { traveller: { kind: "EMPLOYEE", employeeId: "emp-1" }, quoteId: "q1" }, admin);
    const [section, body, access] = m.writeEmployee.mock.calls[0] as unknown as [string, Record<string, unknown>, { user: { id: string }; employee: { id: string }; portal: { actor: { id: string } } }];
    expect(section).toBe("book");
    expect(body).toEqual({ quoteId: "q1" }); // traveller never reaches the employee pipeline's identity check
    expect(access.user.id).toBe("user-1");
    expect(access.employee.id).toBe("emp-1");
    expect(access.portal.actor.id).toBe("admin-user");
  });
  it("only finds employees of the administrator's own company", async () => {
    await expect(adminBookingWrite("booking-quote", { traveller: { kind: "EMPLOYEE", employeeId: "emp-other" } }, admin)).rejects.toMatchObject({ status: 404 });
    const lookups = m.corporateEmployee.findFirst.mock.calls.map((c) => (c[0] as { where: { corporateId: string } }).where.corporateId);
    expect(lookups.every((c) => c === "corp-a")).toBe(true);
    expect(m.writeEmployee).not.toHaveBeenCalled();
  });
  it("refuses inactive employees and employees without an app login", async () => {
    await expect(adminBookingWrite("booking-quote", { traveller: { kind: "EMPLOYEE", employeeId: "emp-off" } }, admin)).rejects.toMatchObject({ status: 409 });
    await expect(adminBookingWrite("booking-quote", { traveller: { kind: "EMPLOYEE", employeeId: "emp-nologin" } }, admin)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("no Corporate Employee App login") });
    expect(m.writeEmployee).not.toHaveBeenCalled();
  });
  it("searches the marketplace with the employee's policy preview", async () => {
    const req = new NextRequest("https://ridegrid.test/api/corporate-admin/booking-search?serviceType=LOCAL&employeeId=emp-1");
    await adminBookingRead(req, "booking-search", admin);
    const access = m.readEmployee.mock.calls[0][2] as unknown as { employee: { id: string; travelPolicyId: string } };
    expect(access.employee.id).toBe("emp-1");
    expect(access.employee.travelPolicyId).toBe("pol-1");
  });
});

describe("booking for a guest", () => {
  const guest = { name: "John Carter", mobile: "98765 43210", email: "john@abc.com", reference: "PO-7" };
  it("evaluates a guest against the company default policy, not the administrator's own limits", async () => {
    await adminBookingWrite("booking-quote", { traveller: { kind: "GUEST", guest }, pricingPackageId: "p" }, admin);
    const access = m.writeEmployee.mock.calls[0][2] as unknown as { user: { id: string }; employee: Record<string, unknown>; portal: { guest: { mobile: string } } };
    expect(access.user.id).toBe("admin-user");
    expect(access.employee).toMatchObject({ travelPolicyId: null, branchId: null, departmentId: null, monthlyTravelLimit: null, yearlyTravelLimit: null });
    expect(access.portal.guest.mobile).toBe("9876543210");
  });
  it("stores the guest with the booking inside the booking transaction and emails them", async () => {
    const result = await adminBookingWrite("booking-book", { traveller: { kind: "GUEST", guest }, quoteId: "q1" }, admin) as { notifications: { guest: Record<string, string> } };
    const access = m.writeEmployee.mock.calls[0][2] as unknown as { portal: { onBooked: (tx: unknown, id: string, basis: string) => Promise<void> } };
    const tx = { corporateBookingTraveller: { create: vi.fn() }, auditLog: { create: vi.fn() } };
    await access.portal.onBooked(tx, "booking-1", "ADMIN_AUTHORISED");
    expect(tx.corporateBookingTraveller.create.mock.calls[0][0].data).toMatchObject({
      bookingId: "booking-1", corporateId: "corp-a", kind: "GUEST", guestName: "John Carter", guestMobile: "9876543210", guestEmail: "john@abc.com", guestReference: "PO-7",
      bookedByUserId: "admin-user", approvalBasis: "ADMIN_AUTHORISED",
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(m.send.mock.calls[0][0]).toMatchObject({ to: { address: "john@abc.com" }, reference: "RG1001" });
    expect(m.send.mock.calls[0][0].text).toContain("KA01AB1234");
    expect(result.notifications.guest).toMatchObject({ email: "SENT", sms: "NOT_CONNECTED", whatsapp: "NOT_CONNECTED" });
  });
  it("reports a failed email honestly and never claims SMS or WhatsApp", async () => {
    m.send.mockResolvedValue({ status: "NOT_CONFIGURED", reason: "x" });
    const result = await adminBookingWrite("booking-book", { traveller: { kind: "GUEST", guest }, quoteId: "q1" }, admin) as { notifications: { guest: Record<string, string> } };
    expect(result.notifications.guest.email).toBe("NOT_CONFIGURED");
    expect(result.notifications.guest.sms).toBe("NOT_CONNECTED");
  });
  it("skips email when the guest gave no address", async () => {
    const result = await adminBookingWrite("booking-book", { traveller: { kind: "GUEST", guest: { ...guest, email: "" } }, quoteId: "q1" }, admin) as { notifications: { guest: Record<string, string> } };
    expect(m.send).not.toHaveBeenCalled();
    expect(result.notifications.guest.email).toBe("NO_ADDRESS");
  });
});

describe("administrator authority over approval", () => {
  const future = new Date(Date.now() + 3 * 86400000); future.setUTCHours(6, 30, 0, 0);
  const snap = { vendorId: "v", vehicleId: "car-a", vehicleCategoryId: "SEDAN", service: "OUTSTATION_ONE_WAY", pricingPackageId: "pkg-a", tripDateTime: future.toISOString(), finalPayable: "4000.00", vendorFundedDiscount: "0", rideGridFundedDiscount: "0", route: { origin: "Pune", destination: "Mumbai", city: "", area: "" }, tripMetrics: { days: "1" } };
  const body = { quoteId: "quote-a", listingId: "car-a", pricingPackageId: "pkg-a", pickupDateTime: future.toISOString(), pickupAddress: "Office", dropAddress: "Airport" };
  const policy = (over: Record<string, unknown> = {}) => ({ id: "pol", policyName: "Strict", maxTripAmount: new Prisma.Decimal(9000), allowedCategories: ["SEDAN"], advanceBookingHours: null, nightTravelAllowed: true, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: true, ...over });
  const access = (portal: boolean) => ({
    user: { id: "user-1", name: "Rahul" }, employee: { ...person(), userId: "user-1", branchId: null, departmentId: null, travelPolicyId: null },
    ...(portal ? { portal: { actor: { id: "admin-user", name: "Ava" }, onBooked: vi.fn() } } : {}),
  });
  beforeEach(() => {
    m.corporateTravelPolicy.findMany.mockResolvedValue([policy()]);
    m.corporateBudget.findMany.mockResolvedValue([]);
    m.corporateApprovalRule.findMany.mockResolvedValue([]);
    m.booking.aggregate.mockResolvedValue({ _sum: { finalFare: null } });
    m.pricingQuote.findUnique.mockResolvedValue({ id: "quote-a", ownerId: "user-1", vehicleId: "car-a", expiresAt: new Date(Date.now() + 600000), snapshot: snap, booking: null });
  });
  const attempt = async (portal: boolean) => {
    try { await realWrite.fn!("book", body, access(portal)); return null; } catch (e) { return e as { code?: string; status?: number }; }
  };

  it("an employee's own request still needs approval when the policy says approve every trip", async () => {
    expect((await attempt(false))?.code).toBe("APPROVAL_REQUIRED");
  });
  it("lets an administrator's portal booking satisfy the every-trip approval (gate passes; fails later only for unrelated mock gaps)", async () => {
    const err = await attempt(true);
    expect(err?.code).not.toBe("APPROVAL_REQUIRED");
    expect(m.corporateApprovalRule.findMany).toHaveBeenCalled();
  });
  it("never bypasses a real policy violation", async () => {
    m.corporateTravelPolicy.findMany.mockResolvedValue([policy({ maxTripAmount: new Prisma.Decimal(1000) })]);
    expect((await attempt(true))?.code).toBe("APPROVAL_REQUIRED");
  });
  it("never bypasses a workflow that names someone other than the administrator", async () => {
    m.corporateApprovalRule.findMany.mockResolvedValue([{ level: 1, approverDesignation: "Manager", maxAmount: null, minAmount: null, approverType: "REPORTING_MANAGER", approverEmployeeId: null, isActive: true, scopeBranchId: null, scopeDepartmentId: null, scopeEmployeeId: null }]);
    expect((await attempt(true))?.code).toBe("APPROVAL_REQUIRED");
  });
});
