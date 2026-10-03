// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Public marketplace responses must never carry vendor/driver private contact,
// bank or identity data, nor internal payout/revenue splits. Contact details are
// released only through role-scoped booking APIs at the right booking state.

const PRIVATE = ["9876500001", "9876500002", "owner@vendor.test", "ravi@driver.test", "ACC-998877", "HDFC0000999", "AADHAAR-4455", "DL-7788", "hash$secret"];

const m = vi.hoisted(() => ({
  pricingPackage: { findMany: vi.fn() },
  booking: { findFirst: vi.fn() },
  forPackage: vi.fn(),
  findMarketplaceAvailable: vi.fn(),
  requestUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { pricingPackage: m.pricingPackage, booking: m.booking } }));
vi.mock("@/lib/services/pricing/QuoteService", () => ({ quoteService: { forPackage: m.forPackage } }));
vi.mock("@/lib/repositories/vehicle", () => ({ vehicleRepository: { findMarketplaceAvailable: m.findMarketplaceAvailable } }));
vi.mock("@/lib/request-access", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/request-access");
  const { hasPermission } = await vi.importActual<typeof import("@/lib/permissions")>("@/lib/permissions");
  const { NextResponse } = await import("next/server");
  // Same decision as the real guard, driven by the mocked session user.
  const requestPermission = async (_req: unknown, permission: Parameters<typeof hasPermission>[1]) => {
    const user = await m.requestUser();
    if (!user) return { user: null, denied: NextResponse.json({ success: false }, { status: 401 }) };
    if (!hasPermission(user.role, permission)) return { user: null, denied: NextResponse.json({ success: false }, { status: 403 }) };
    return { user, denied: null };
  };
  return { ...actual, requestUser: m.requestUser, requestPermission };
});

import { GET as search } from "@/app/api/marketplace/search/route";
import { GET as bookingGet } from "@/app/api/bookings/[id]/route";
import { bookingView, bookingViewSelect } from "@/lib/services/booking/BookingContactPolicy";

const vendorUser = { id: "vendor-user", name: "Owner Person", email: "owner@vendor.test", mobile: "9876500001", passwordHash: "hash$secret", isActive: true, deletedAt: null };
const vendor = (over: Record<string, unknown> = {}) => ({
  id: "v1", companyName: "Sahyadri Cabs", isApproved: true, verifiedAt: new Date("2026-01-01"), suspendedAt: null, deletedAt: null,
  accountNumber: "ACC-998877", ifscCode: "HDFC0000999", bankName: "HDFC", user: vendorUser, ...over,
});
const driver = {
  id: "d1", firstName: "Ravi", lastName: "Kumar", status: "ACTIVE", deletedAt: null, aadhaarNumber: "AADHAAR-4455", licenseNumber: "DL-7788",
  user: { id: "driver-user", name: "Ravi Kumar", email: "ravi@driver.test", mobile: "9876500002", passwordHash: "hash$secret", isActive: true, deletedAt: null, isVerified: true },
};
const vehicle = (id: string, v = vendor()) => ({
  id, registrationNumber: `MH12${id}`, make: "Toyota", model: "Innova", variant: null, year: 2024, category: "SUV", fuelType: "DIESEL", transmission: "MANUAL",
  seatingCapacity: 7, luggageCapacity: 3, color: "White", homeCity: "Pune", status: "AVAILABLE", isVerified: true, deletedAt: null,
  vendorId: v.id, driverId: "d1", vendor: v, driver, trips: [], rating: 4.8, totalTrips: 12,
});
const pkg = (id: string, car: ReturnType<typeof vehicle>) => ({
  id, vehicleId: car.id, pricingRuleId: "rule", packageType: "LOCAL", packageName: "Local 8 hr", city: "Pune", fromCity: null, toCity: null,
  airportName: null, transferDirection: null, includedKm: 80, includedHours: 8, baseFare: 2000, extraKmRate: 14, extraHourRate: 150, driverAllowance: 0,
  nightCharge: null, tollCharge: null, parkingCharge: null, otherCharges: null, extraPickupCharge: null, extraDropCharge: null,
  pricingRule: { pricingType: "LOCAL", tripType: "ONEWAY", isActive: true, nightCharge: null, waitingCharge: null }, vehicle: car,
});
const snapshot = { vendorFare: "2000.00", platformFee: "100.00", taxAmount: "105.00", finalPayable: "2205.00", vendorPayout: "2000.00", processingCost: "44.10", rideGridRevenue: "55.90", calculationRule: { operational: null } };

const anonymousSearch = () => search(new NextRequest("https://ridegrid.test/api/marketplace/search?serviceType=LOCAL&pickupCity=Pune"));

beforeEach(() => {
  vi.resetAllMocks();
  m.requestUser.mockResolvedValue(null);
  m.forPackage.mockResolvedValue({ id: null, expiresAt: new Date(), snapshot });
  m.findMarketplaceAvailable.mockImplementation(async (where: { id: { in: string[] } }) => cars.filter(c => where.id.in.includes(c.id)));
});
let cars: ReturnType<typeof vehicle>[] = [];

describe("anonymous marketplace search", () => {
  it("returns public vendor and driver details only", async () => {
    cars = [vehicle("car1")];
    m.pricingPackage.findMany.mockResolvedValue([pkg("p1", cars[0])]);
    const res = await anonymousSearch();
    expect(res.status).toBe(200);
    const body = await res.json();
    const listing = body.data.listings[0];
    expect(listing.vendor).toEqual({ id: "v1", companyName: "Sahyadri Cabs", approved: true, verified: true });
    expect(listing.driver).toEqual({ id: "d1", verified: true, name: "Ravi" });
    const text = JSON.stringify(body);
    for (const secret of PRIVATE) expect(text).not.toContain(secret);
    expect(text).not.toMatch(/"mobile"|"email"|passwordHash|accountNumber|ifsc|aadhaar|licenseNumber/i);
  });

  it("never exposes the internal payout / revenue split in the public quote", async () => {
    cars = [vehicle("car1")];
    m.pricingPackage.findMany.mockResolvedValue([pkg("p1", cars[0])]);
    const quote = (await (await anonymousSearch()).json()).data.listings[0].pricing.quote;
    expect(quote.finalPayable).toBe("2205.00");
    expect(quote).not.toHaveProperty("vendorPayout");
    expect(quote).not.toHaveProperty("processingCost");
    expect(quote).not.toHaveProperty("rideGridRevenue");
  });

  it("excludes suspended vendors and reports verification state", async () => {
    cars = [vehicle("car1", vendor({ id: "v-suspended", suspendedAt: new Date() })), vehicle("car2", vendor({ id: "v-unverified", verifiedAt: null }))];
    m.pricingPackage.findMany.mockResolvedValue([pkg("p1", cars[0]), pkg("p2", cars[1])]);
    const listings = (await (await anonymousSearch()).json()).data.listings;
    expect(listings.map((l: { id: string }) => l.id)).toEqual(["car2"]);
    expect(listings[0].vendor.verified).toBe(false);
  });
});

describe("booking contact policy", () => {
  const row = (status: string) => ({
    id: "b1", bookingNumber: "RG-1", bookingSource: "WEBSITE", status, tripType: "ONEWAY", tripDays: 1, pickupLocation: "A", dropLocation: "B",
    pickupDateTime: new Date(), createdAt: new Date(), holdExpiresAt: null, estimatedFare: 2205, baseFare: 2000, taxAmount: 105, discountAmount: 0, couponAmount: 0,
    extraCharges: 0, finalFare: 2205, vendorEarning: 2000, cancelReason: null, cancelledAt: null, refundAmount: null,
    customer: { id: "c1", firstName: "Asha", lastName: "Rao", user: { id: "cust-user", name: "Asha Rao", email: "asha@c.test", mobile: "9000000001" } },
    vendor: { id: "v1", companyName: "Sahyadri Cabs", userId: "vendor-user", user: { name: vendorUser.name, email: vendorUser.email, mobile: vendorUser.mobile } },
    vehicle: { id: "car1", make: "Toyota", model: "Innova", variant: null, category: "SUV", fuelType: "DIESEL", transmission: "MANUAL", seatingCapacity: 7, luggageCapacity: 3, year: 2024, color: "White", registrationNumber: "MH12" },
    driver: { id: "d1", firstName: "Ravi", lastName: "Kumar", user: { mobile: driver.user.mobile } },
    trip: null, transactions: [], statusHistory: [],
  }) as unknown as Parameters<typeof bookingView>[0];

  it("never selects vendor bank or driver identity fields", () => {
    const s = JSON.stringify(bookingViewSelect);
    expect(s).not.toMatch(/accountNumber|ifscCode|bankName|aadhaar|licenseNumber|policeVerification|passwordHash|priceSnapshot|gatewayTransactionId/);
  });

  it("gives the customer the driver's number only while the assignment is live", () => {
    const customer = { id: "cust-user", role: "CUSTOMER" };
    const confirmed = bookingView(row("CONFIRMED"), customer);
    expect(confirmed.driver?.user.mobile).toBeNull();
    expect(confirmed.vendor).toEqual({ id: "v1", companyName: "Sahyadri Cabs" });
    expect(confirmed).not.toHaveProperty("vendorEarning");
    expect(bookingView(row("DRIVER_ASSIGNED"), customer).driver?.user.mobile).toBe("9876500002");
    expect(bookingView(row("TRIP_COMPLETED"), customer).driver?.user.mobile).toBeNull();
  });

  it("keeps operational contacts for Super Admin and the booking's own vendor", () => {
    const admin = bookingView(row("CONFIRMED"), { id: "admin", role: "SUPER_ADMIN" });
    expect(admin.vendor).toMatchObject({ user: { mobile: "9876500001", email: "owner@vendor.test" } });
    expect(admin.driver?.user.mobile).toBe("9876500002");
    const ownVendor = bookingView(row("CONFIRMED"), { id: "vendor-user", role: "VENDOR" });
    expect(ownVendor.vendorEarning).toBe(2000);
    expect(ownVendor.customer.user).toEqual({ id: "cust-user", name: "Asha Rao" });
    expect(bookingView(row("TRIP_STARTED"), { id: "vendor-user", role: "VENDOR" }).customer.user).toMatchObject({ mobile: "9000000001" });
  });

  it("the booking route requires sign-in and scopes the lookup to the caller", async () => {
    const get = () => bookingGet(new NextRequest("https://ridegrid.test/api/bookings/b1"), { params: Promise.resolve({ id: "b1" }) });
    expect((await get()).status).toBe(401);
    m.requestUser.mockResolvedValue({ id: "cust-user", role: "CUSTOMER" });
    m.booking.findFirst.mockResolvedValue(row("CONFIRMED"));
    const res = await get();
    expect(res.status).toBe(200);
    expect(m.booking.findFirst.mock.calls[0][0].where).toMatchObject({ id: "b1", deletedAt: null, customer: { userId: "cust-user" } });
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("9876500001");
    expect(text).not.toContain("9876500002");
    expect(text).not.toContain("owner@vendor.test");
  });
});
