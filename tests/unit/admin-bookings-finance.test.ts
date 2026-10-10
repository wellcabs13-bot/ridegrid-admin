// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Paginated admin bookings API, legacy (pre-snapshot) finance honesty, and the
// dashboard aggregation contract.
const m = vi.hoisted(() => {
  const model = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() });
  const db: Record<string, any> = {};
  for (const k of ["booking", "corporateEmployee", "corporateApprovalRequest", "auditLog", "rideGridEvent", "user", "customer", "vendor", "vehicle", "driver", "corporate", "transaction", "supportTicket", "corporateWallet"]) db[k] = model();
  db.$queryRaw = vi.fn();
  return { db, requestUser: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: m.db }));
vi.mock("@/lib/request-access", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/request-access");
  return { ...actual, requestUser: m.requestUser };
});

import { GET as listGET } from "@/app/api/admin/bookings/route";
import { GET as dashboardGET } from "@/app/api/admin/dashboard/route";
import { bookingDetail } from "@/lib/services/admin/BookingAdminService";
import { bookingRevenue } from "@/lib/services/admin/metrics";

const ADMIN = { id: "admin", role: "SUPER_ADMIN" };
beforeEach(() => { vi.resetAllMocks(); m.requestUser.mockResolvedValue(ADMIN); });

describe("paginated admin bookings API", () => {
  it("rejects anonymous and non-staff callers", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await listGET(new NextRequest("https://r.test/api/admin/bookings"))).status).toBe(401);
    m.requestUser.mockResolvedValue({ id: "c", role: "CUSTOMER" });
    expect((await listGET(new NextRequest("https://r.test/api/admin/bookings"))).status).toBe(403);
    expect(m.db.booking.findMany).not.toHaveBeenCalled();
  });
  it("pages on the server with a bounded page size and total count", async () => {
    m.db.booking.count.mockResolvedValue(260);
    m.db.booking.findMany.mockResolvedValue([]);
    const res = await listGET(new NextRequest("https://r.test/api/admin/bookings?page=3&pageSize=500&status=CONFIRMED"));
    const body = await res.json();
    expect(body.data).toMatchObject({ total: 260, page: 3, pageSize: 100, totalPages: 3 });
    const args = m.db.booking.findMany.mock.calls[0][0];
    expect(args).toMatchObject({ skip: 200, take: 100, where: { status: "CONFIRMED", deletedAt: null } });
    expect(m.db.booking.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("legacy bookings without a pricing snapshot", () => {
  const legacy = {
    id: "b-legacy", bookingNumber: "WC1000", bookingSource: "WEBSITE", status: "CONFIRMED", tripType: "ONEWAY", tripDays: 1, pickupLocation: "A", dropLocation: "B",
    pickupDateTime: new Date(), reservedFrom: null, reservedUntil: null, holdExpiresAt: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, corporateId: null,
    priceSnapshot: null, baseFare: 2400, taxAmount: 0, extraCharges: null, discountAmount: null, finalFare: 2400, estimatedFare: 2400, vendorEarning: 2400,
    customer: { id: "c", firstName: "A", lastName: "B", deletedAt: null, user: { id: "u", email: "a@b.test", mobile: null, role: "CUSTOMER", isActive: true } },
    corporate: null, vendor: { id: "v", companyName: "V", isApproved: true, verifiedAt: new Date(), suspendedAt: null, user: { name: "V", email: "v@v.test", mobile: null } },
    vehicle: {}, driver: null, pricingPackage: null, transactions: [], statusHistory: [], trip: null, invoice: null,
  };
  it("reports the fee and RideGrid revenue as unknown, never zero or estimated", async () => {
    m.db.booking.findUnique.mockResolvedValue(legacy);
    m.db.auditLog.findMany.mockResolvedValue([]); m.db.rideGridEvent.findMany.mockResolvedValue([]);
    const d = await bookingDetail("b-legacy");
    expect(d.fare).toMatchObject({ snapshotAvailable: false, platformFee: null, rideGridRevenue: null, total: 2400 });
  });
  it("sums platform fee only from snapshots and flags incomplete coverage", async () => {
    m.db.booking.aggregate.mockResolvedValue({ _count: { _all: 9 }, _sum: { finalFare: 20000, taxAmount: 500, vendorEarning: 17000, extraCharges: 0, discountAmount: 0 } });
    m.db.$queryRaw.mockResolvedValue([{ platformFee: 600, rideGridRevenue: 450, withSnapshot: 6n, total: 9n }]);
    const r = await bookingRevenue({});
    expect(r.platformFee).toBe(600);
    expect(r.snapshotCoverage).toEqual({ withSnapshot: 6, total: 9, complete: false });
  });
});

describe("dashboard aggregation", () => {
  it("is staff-only and built from central aggregates", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await dashboardGET(new NextRequest("https://r.test/api/admin/dashboard"))).status).toBe(401);
    m.requestUser.mockResolvedValue(ADMIN);
    for (const k of ["booking", "customer", "corporateEmployee", "vendor", "vehicle", "driver", "corporate", "corporateApprovalRequest", "supportTicket"]) m.db[k].count.mockResolvedValue(2);
    m.db.booking.aggregate.mockResolvedValue({ _count: { _all: 3 }, _sum: { finalFare: 3000, taxAmount: 150, vendorEarning: 2500, extraCharges: 0, discountAmount: 0 } });
    m.db.$queryRaw.mockResolvedValue([{ platformFee: 200, rideGridRevenue: 150, withSnapshot: 3n, total: 3n }]);
    m.db.transaction.groupBy.mockResolvedValue([{ transactionType: "BOOKING_PAYMENT", paymentStatus: "PAID", paymentMethod: "UPI", _sum: { amount: 3000 }, _count: { _all: 3 } }]);
    m.db.transaction.aggregate.mockResolvedValue({ _sum: { amount: 1200 }, _count: { _all: 1 } });
    m.db.corporateWallet.findMany.mockResolvedValue([{ corporateId: "c1", balance: 800, creditLimit: 5000, corporate: { creditLimit: 5000 } }]);
    m.db.booking.findMany.mockResolvedValue([]);
    const body = await (await dashboardGET(new NextRequest("https://r.test/api/admin/dashboard"))).json();
    expect(body.data.revenue).toMatchObject({ thisMonth: 3000, gstThisMonth: 150, platformFeeThisMonth: 200, snapshotComplete: true, collectedThisMonth: 3000, corporateOutstanding: 800 });
    expect(body.data.people.activeVendors).toBe(2);
  });
});
