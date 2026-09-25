// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  corporateEmployee: { findFirst: vi.fn() },
  corporateTravelPolicy: { findFirst: vi.fn() },
  corporateApprovalRule: { findMany: vi.fn() },
  corporateApprovalRequest: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  corporateApprovalStep: { updateMany: vi.fn() },
  booking: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  pricingQuote: { findUnique: vi.fn() },
  notification: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
  user: { findMany: vi.fn() },
  corporate: { findFirst: vi.fn() },
  corporateWallet: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));

import { GET, POST } from "@/app/api/mobile/corporate/[section]/route";
import { GET as approverGet, POST as approverPost } from "@/app/api/corporate/approval-requests/route";
import { decideTravelPolicy } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { safeBooking, safeFare, approvalStatus } from "@/lib/corporate-employee-mobile/selects";

const base = "https://ridegrid.test/api/mobile/corporate/";
const get = (section: string, query = "") => GET(new NextRequest(`${base}${section}${query}`), { params: Promise.resolve({ section }) });
const post = (section: string, body: unknown, headers: Record<string, string> = {}) =>
  POST(new NextRequest(`${base}${section}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } }), { params: Promise.resolve({ section }) });

const employee = (over: Record<string, unknown> = {}) => ({
  id: "emp-a", corporateId: "corp-a", userId: "user-a", isActive: true, employeeName: "Asha Rao", employeeCode: "E1", officialEmail: "asha@a.test",
  mobile: "9000000000", designation: "Analyst", employeeGrade: null, managerName: null, isApprover: false,
  monthlyTravelLimit: null, yearlyTravelLimit: null, defaultPickupAddress: null, branch: null, department: null, costCenter: null,
  corporate: { id: "corp-a", companyName: "Acme", status: "ACTIVE", deletedAt: null, approvalFlow: "MANAGER", billingCycle: "MONTHLY" }, ...over,
});
const future = new Date(Date.now() + 3 * 86400000);
future.setUTCHours(6, 30, 0, 0); // 12:00 IST, daytime
const snapshot = (over: Record<string, unknown> = {}) => ({
  vendorId: "vendor-a", vehicleId: "car-a", vehicleCategoryId: "SEDAN", service: "OUTSTATION_ONE_WAY", pricingPackageId: "pkg-a",
  tripDateTime: future.toISOString(), finalPayable: "4000.00", vendorFare: "3500.00", platformFee: "100.00", taxAmount: "400.00",
  vendorFundedDiscount: "0.00", rideGridFundedDiscount: "0.00", passThroughTotal: "0.00", vendorPayout: "3500.00", rideGridRevenue: "90.00",
  processingCost: "10.00", taxComponents: [], passThroughCharges: [], route: { origin: "Pune", destination: "Mumbai", city: "", area: "" },
  tripMetrics: { days: "1" }, calculationRule: {}, ...over,
});
const bookBody = { quoteId: "quote-a", listingId: "car-a", pricingPackageId: "pkg-a", pickupDateTime: future.toISOString(), pickupAddress: "Office", dropAddress: "Airport" };
const policy = (over: Record<string, unknown> = {}) => ({
  id: "pol", policyName: "Standard", maxTripAmount: new Prisma.Decimal(5000), allowedCategories: ["SEDAN"], advanceBookingHours: null,
  nightTravelAllowed: true, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.requestUser.mockResolvedValue({ id: "user-a", name: "Asha", role: "CORPORATE_EMPLOYEE" });
  m.corporateEmployee.findFirst.mockResolvedValue(employee());
  m.corporateTravelPolicy.findFirst.mockResolvedValue(policy());
  m.corporateApprovalRule.findMany.mockResolvedValue([]);
  m.booking.aggregate.mockResolvedValue({ _sum: { finalFare: null } });
  m.booking.findMany.mockResolvedValue([]);
  m.corporateApprovalRequest.findMany.mockResolvedValue([]);
  m.pricingQuote.findUnique.mockResolvedValue({ id: "quote-a", ownerId: "user-a", vehicleId: "car-a", expiresAt: new Date(Date.now() + 600000), snapshot: snapshot(), booking: null });
  m.$transaction.mockImplementation((fn: (tx: typeof m) => unknown) => fn(m));
});

describe("corporate employee role and identity", () => {
  it("rejects anonymous users and every non-employee role", async () => {
    m.requestUser.mockResolvedValue(null); expect((await get("profile")).status).toBe(401);
    for (const role of ["CUSTOMER", "CORPORATE_ADMIN", "DRIVER", "VENDOR", "SUPER_ADMIN"]) {
      m.requestUser.mockResolvedValue({ id: "user-a", name: "x", role });
      expect((await get("profile")).status).toBe(403);
    }
    expect(m.corporateEmployee.findFirst).not.toHaveBeenCalled();
  });
  it("rejects inactive employees and inactive companies", async () => {
    m.corporateEmployee.findFirst.mockResolvedValue(employee({ isActive: false })); expect((await get("home")).status).toBe(403);
    m.corporateEmployee.findFirst.mockResolvedValue(employee({ corporate: { ...employee().corporate, status: "SUSPENDED" } })); expect((await get("home")).status).toBe(403);
    m.corporateEmployee.findFirst.mockResolvedValue(null); expect((await get("home")).status).toBe(403);
  });
  it("resolves identity from the session, never the request", async () => {
    await get("profile"); expect(m.corporateEmployee.findFirst.mock.calls[0][0].where).toEqual({ userId: "user-a" });
    expect((await get("trips", "?corporateId=corp-b")).status).toBe(403);
    expect((await get("approvals", "?employeeId=emp-b")).status).toBe(403);
    expect((await post("book", { ...bookBody, corporateId: "corp-b" })).status).toBe(403);
    expect((await post("approvals", { ...bookBody, employeeId: "emp-b" })).status).toBe(403);
    expect(m.$transaction).not.toHaveBeenCalled();
  });
  it("rejects cross-site mutations", async () => {
    expect((await post("book", bookBody, { origin: "https://evil.test" })).status).toBe(403);
    expect(m.pricingQuote.findUnique).not.toHaveBeenCalled();
  });
});

describe("own-record scoping", () => {
  it("scopes trips to the employee's own company bookings", async () => {
    m.booking.findFirst.mockResolvedValue(null);
    expect((await get("trips", "?id=booking-b")).status).toBe(404);
    expect(m.booking.findFirst.mock.calls[0][0].where).toEqual({ corporateId: "corp-a", deletedAt: null, customer: { userId: "user-a" }, id: "booking-b" });
    await get("trips", "?filter=COMPLETED");
    expect(m.booking.findMany.mock.calls[0][0].where).toMatchObject({ corporateId: "corp-a", customer: { userId: "user-a" }, status: "TRIP_COMPLETED" });
  });
  it("scopes approval requests and notification writes", async () => {
    m.corporateApprovalRequest.findFirst.mockResolvedValue(null);
    expect((await get("approvals", "?id=req-b")).status).toBe(404);
    expect(m.corporateApprovalRequest.findFirst.mock.calls[0][0].where).toEqual({ employeeId: "emp-a", corporateId: "corp-a", id: "req-b" });
    m.notification.updateMany.mockResolvedValue({ count: 0 });
    await post("notifications", { id: "notice-b" });
    expect(m.notification.updateMany.mock.calls[0][0].where).toEqual({ id: "notice-b", userId: "user-a", readAt: null });
  });
  it("cancels only the employee's own unbooked request", async () => {
    m.corporateApprovalRequest.updateMany.mockResolvedValue({ count: 0 });
    expect((await post("approvals", { action: "CANCEL", id: "req-b" })).status).toBe(409);
    expect(m.corporateApprovalRequest.updateMany.mock.calls[0][0].where).toMatchObject({ id: "req-b", employeeId: "emp-a", bookingId: null });
  });
});

describe("travel policy decisions", () => {
  const trip = { amount: "4000", category: "SEDAN", serviceType: "LOCAL" as const, pickupDateTime: future };
  const none = { monthlyTravelLimit: null, yearlyTravelLimit: null };
  const zero = { monthUsed: 0, yearUsed: 0 };
  it("allows compliant travel", () => { expect(decideTravelPolicy(policy(), trip, none, zero).decision).toBe("ALLOWED"); });
  it("requires approval for limit, category, night and company-wide rules", () => {
    expect(decideTravelPolicy(policy(), { ...trip, amount: "5000.01" }, none, zero).decision).toBe("APPROVAL_REQUIRED");
    expect(decideTravelPolicy(policy(), { ...trip, category: "SUV" }, none, zero).decision).toBe("APPROVAL_REQUIRED");
    const night = new Date(future); night.setUTCHours(17, 30); // 23:00 IST
    expect(decideTravelPolicy(policy({ nightTravelAllowed: false }), { ...trip, pickupDateTime: night }, none, zero).reasons).toContain("Night travel is not allowed by corporate policy.");
    expect(decideTravelPolicy(policy({ approvalRequired: true }), trip, none, zero).decision).toBe("APPROVAL_REQUIRED");
    expect(decideTravelPolicy(null, trip, { monthlyTravelLimit: new Prisma.Decimal(5000), yearlyTravelLimit: null }, { monthUsed: 1500, yearUsed: 1500 }).decision).toBe("APPROVAL_REQUIRED");
  });
  it("blocks prohibited travel even when other rules pass", () => {
    const outstation = decideTravelPolicy(policy({ outstationAllowed: false }), { ...trip, serviceType: "OUTSTATION" }, none, zero);
    expect(outstation.decision).toBe("NOT_ALLOWED");
    expect(decideTravelPolicy(policy({ advanceBookingHours: 24 * 7 }), trip, none, zero).decision).toBe("NOT_ALLOWED");
    expect(decideTravelPolicy(policy({ airportTravelAllowed: false }), { ...trip, serviceType: "AIRPORT" }, none, zero).decision).toBe("NOT_ALLOWED");
  });
});

describe("booking enforcement", () => {
  it("refuses a not-allowed ride before any booking work", async () => {
    m.corporateTravelPolicy.findFirst.mockResolvedValue(policy({ outstationAllowed: false }));
    const r = await post("book", bookBody); expect(r.status).toBe(403); expect((await r.json()).code).toBe("POLICY_NOT_ALLOWED");
    expect(m.$transaction).not.toHaveBeenCalled();
  });
  it("refuses to book an approval-required ride without an approval", async () => {
    m.corporateTravelPolicy.findFirst.mockResolvedValue(policy({ approvalRequired: true }));
    const r = await post("book", bookBody); expect(r.status).toBe(409); expect((await r.json()).code).toBe("APPROVAL_REQUIRED");
    expect(m.$transaction).not.toHaveBeenCalled();
  });
  it("rejects another employee's approval and an approval below the current fare", async () => {
    m.corporateTravelPolicy.findFirst.mockResolvedValue(policy({ approvalRequired: true }));
    m.corporateApprovalRequest.findFirst.mockResolvedValue(null);
    expect((await post("book", { ...bookBody, approvalId: "req-b" })).status).toBe(404);
    expect(m.corporateApprovalRequest.findFirst.mock.calls[0][0].where).toEqual({ id: "req-b", employeeId: "emp-a", corporateId: "corp-a" });
    m.corporateApprovalRequest.findFirst.mockResolvedValue({ status: "APPROVED", bookingId: null, amount: new Prisma.Decimal(3000), requestSnapshot: { pricingPackageId: "pkg-a", listingId: "car-a", pickupDateTime: future.toISOString(), pickupAddress: "Office", dropAddress: "Airport" } });
    const r = await post("book", { ...bookBody, approvalId: "req-a" }); expect((await r.json()).code).toBe("APPROVAL_AMOUNT_EXCEEDED");
    m.corporateApprovalRequest.findFirst.mockResolvedValue({ status: "PENDING", bookingId: null, amount: new Prisma.Decimal(9000), requestSnapshot: { pricingPackageId: "pkg-a" } });
    expect((await post("book", { ...bookBody, approvalId: "req-a" })).status).toBe(409);
    expect(m.$transaction).not.toHaveBeenCalled();
  });
  it("rejects a quote owned by someone else or for a different trip", async () => {
    m.pricingQuote.findUnique.mockResolvedValue({ id: "quote-a", ownerId: "user-b", vehicleId: "car-a", expiresAt: new Date(Date.now() + 600000), snapshot: snapshot(), booking: null });
    expect((await post("book", bookBody)).status).toBe(403);
    m.pricingQuote.findUnique.mockResolvedValue({ id: "quote-a", ownerId: "user-a", vehicleId: "car-a", expiresAt: new Date(Date.now() + 600000), snapshot: snapshot({ pricingPackageId: "pkg-z" }), booking: null });
    expect((await post("book", bookBody)).status).toBe(409);
    expect(m.$transaction).not.toHaveBeenCalled();
  });
  it("only submits approval when the server says approval is required", async () => {
    const r = await post("approvals", bookBody); expect((await r.json()).code).toBe("APPROVAL_NOT_NEEDED");
    expect(m.corporateApprovalRequest.create).not.toHaveBeenCalled();
  });
});

describe("approver decisions", () => {
  const approve = (body: unknown) => approverPost(new NextRequest("https://ridegrid.test/api/corporate/approval-requests", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));
  it("denies employees and scopes corporate admins to their own company", async () => {
    expect((await approve({ id: "req-a", action: "APPROVE" })).status).toBe(403);
    m.requestUser.mockResolvedValue({ id: "admin-a", name: "A", role: "CORPORATE_ADMIN" });
    m.corporateEmployee.findFirst.mockResolvedValue({ corporateId: "corp-a" });
    m.corporateApprovalRequest.findFirst.mockResolvedValue(null);
    expect((await approve({ id: "req-b", action: "APPROVE" })).status).toBe(404);
    expect(m.corporateApprovalRequest.findFirst.mock.calls[0][0].where).toEqual({ id: "req-b", corporateId: "corp-a" });
    const list = await approverGet(new NextRequest("https://ridegrid.test/api/corporate/approval-requests?corporateId=corp-b"));
    expect(list.status).toBe(403);
  });
  it("advances multi-step approvals and notifies the employee only at the end", async () => {
    m.requestUser.mockResolvedValue({ id: "ops", name: "O", role: "OPERATIONS" });
    const request = { id: "req-a", status: "PENDING", currentStage: "MANAGER", requestSnapshot: { pickupDateTime: future.toISOString() }, employee: { userId: "user-a" },
      steps: [{ id: "s1", level: 1, stage: "MANAGER", status: "PENDING" }, { id: "s2", level: 2, stage: "FINANCE", status: "PENDING" }] };
    m.corporateApprovalRequest.findFirst.mockResolvedValue(request);
    m.corporateApprovalStep.updateMany.mockResolvedValue({ count: 1 }); m.corporateApprovalRequest.updateMany.mockResolvedValue({ count: 1 });
    expect((await (await approve({ id: "req-a", action: "APPROVE" })).json()).data).toMatchObject({ status: "PENDING", currentStage: "FINANCE" });
    expect(m.notification.create).not.toHaveBeenCalled();
    m.corporateApprovalRequest.findFirst.mockResolvedValue({ ...request, steps: [{ ...request.steps[0], status: "APPROVED" }, request.steps[1]] });
    expect((await (await approve({ id: "req-a", action: "APPROVE" })).json()).data.status).toBe("APPROVED");
    expect(m.notification.create.mock.calls[0][0].data.userId).toBe("user-a");
  });
  it("requires a reason to reject", async () => {
    m.requestUser.mockResolvedValue({ id: "ops", name: "O", role: "OPERATIONS" });
    expect((await approve({ id: "req-a", action: "REJECT" })).status).toBe(400);
  });
});

describe("safe DTOs", () => {
  it("never exposes vendor payout, processing cost or RideGrid revenue", () => {
    const fare = safeFare(snapshot());
    expect(Object.keys(fare!)).not.toEqual(expect.arrayContaining(["vendorPayout"]));
    expect(JSON.stringify(fare)).not.toMatch(/vendorPayout|rideGridRevenue|processingCost/);
    expect(fare).toMatchObject({ vendorFare: "3500.00", platformFee: "100.00", taxAmount: "400.00", finalPayable: "4000.00" });
  });
  it("shows driver contact only for a live assignment", () => {
    const row = { id: "b", bookingNumber: "RG-1", status: "TRIP_COMPLETED", tripType: "ONEWAY", tripDays: 1, bookingSource: "CORPORATE", pickupLocation: "a", dropLocation: "b", pickupDateTime: future, createdAt: future,
      finalFare: new Prisma.Decimal(4000), estimatedFare: new Prisma.Decimal(4000), priceSnapshot: snapshot(), pricingPackage: null,
      vehicle: { make: "M", model: "X", category: "SEDAN", registrationNumber: "MH12", seatingCapacity: 4 }, vendor: { companyName: "V" },
      driver: { firstName: "D", lastName: "K", user: { mobile: "9111111111" } }, transactions: [], trip: null } as unknown as Parameters<typeof safeBooking>[0];
    expect(safeBooking(row).driver?.mobile).toBeNull();
    expect(safeBooking({ ...row, status: "DRIVER_ASSIGNED" } as typeof row).driver?.mobile).toBe("9111111111");
  });
  it("reports expired requests honestly", () => {
    const past = { pickupDateTime: new Date(Date.now() - 1000).toISOString() };
    expect(approvalStatus({ status: "PENDING", bookingId: null, requestSnapshot: past })).toBe("EXPIRED");
    expect(approvalStatus({ status: "APPROVED", bookingId: "b", requestSnapshot: past })).toBe("BOOKED");
    expect(approvalStatus({ status: "REJECTED", bookingId: null, requestSnapshot: past })).toBe("REJECTED");
  });
});
