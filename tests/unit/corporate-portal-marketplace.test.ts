// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const m = vi.hoisted(() => ({
  search: vi.fn(),
  forPackage: vi.fn(),
  corporateEmployee: { findFirst: vi.fn(), findMany: vi.fn() },
  corporateTravelPolicy: { findMany: vi.fn() },
  corporateBudget: { findMany: vi.fn() },
  booking: { aggregate: vi.fn() },
  pricingPackage: { findMany: vi.fn() },
  vehicleFind: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
vi.mock("@/lib/events/event-dispatcher", () => ({ emitRideGridEvent: vi.fn(), dispatchRideGridEvent: vi.fn() }));
vi.mock("@/lib/repositories/vehicle", () => ({ vehicleRepository: { findMarketplaceAvailable: m.vehicleFind } }));
vi.mock("@/lib/services/marketplace/BookingAvailabilityService", async (orig) => ({
  ...(await orig<object>()),
  findUnavailableAssignments: vi.fn(async () => ({ unavailableVehicleIds: new Set(), unavailableDriverIds: new Set() })),
}));
vi.mock("@/lib/services/pricing/QuoteService", async (orig) => ({ ...(await orig<object>()), quoteService: { forPackage: m.forPackage } }));

import { adminBookingRead, adminBookingWrite } from "@/lib/corporate-admin/booking";
import { MarketplaceListingService } from "@/lib/services/marketplace/MarketplaceListingService";
import * as listingModule from "@/lib/services/marketplace/MarketplaceListingService";
import { GET as publicSearch } from "@/app/api/marketplace/search/route";

const admin = { user: { id: "admin-user", name: "Ava" }, corporateId: "corp-a", adminEmployeeId: "emp-admin", company: { id: "corp-a", companyName: "Acme", status: "ACTIVE" } };
const person = (over: Record<string, unknown> = {}) => ({
  id: "emp-1", corporateId: "corp-a", userId: "user-1", isActive: true, canBook: true, branchId: null, departmentId: null, travelPolicyId: null, employeeName: "Rahul Mehta",
  employeeCode: "E1", officialEmail: "r@a.test", mobile: "9000000000", designation: "Mgr", employeeGrade: null, managerName: null, isApprover: false,
  monthlyTravelLimit: null, yearlyTravelLimit: null, defaultPickupAddress: null, branch: null, department: null, costCenter: null,
  corporate: { id: "corp-a", companyName: "Acme", status: "ACTIVE", deletedAt: null, approvalFlow: "MANAGER", billingCycle: "MONTHLY" }, ...over,
});

// A listing exactly as the canonical marketplace service returns it.
const canonical = {
  id: "veh-1",
  vehicle: { id: "veh-1", registrationNumber: "KA01AB1234", make: "Toyota", model: "Innova", variant: "Crysta", category: "SUV", fuelType: "DIESEL", transmission: "MANUAL", seatingCapacity: 7, luggageCapacity: 3 },
  pricing: {
    quote: { finalPayable: "10000.00", service: "OUTSTATION_ONE_WAY", vendorFare: "9000.00", platformFee: "500.00", taxAmount: "500.00" },
    pricingPackageId: "pkg-1", packageName: "Pune to Mumbai", tripDays: 1, includedKm: 150, includedHours: null, extraKmRate: 12, extraHourRate: null, driverAllowance: null,
  },
  vendor: { id: "ven-1", companyName: "Sri Travels" }, driver: { id: "drv-1", name: "Ramesh", verified: true },
};
const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const params = `serviceType=OUTSTATION&tripType=ONEWAY&pickupCity=Pune&dropCity=Mumbai&date=${future}&time=10:00&category=SUV`;

beforeEach(() => {
  vi.clearAllMocks();
  m.corporateEmployee.findFirst.mockImplementation(async (a: { where: { id: string } }) => (a.where.id === "emp-1" ? person() : person({ id: "emp-admin", userId: "admin-user" })));
  m.corporateTravelPolicy.findMany.mockResolvedValue([]);
  m.corporateBudget.findMany.mockResolvedValue([]);
  m.booking.aggregate.mockResolvedValue({ _sum: { finalFare: null } });
  vi.spyOn(listingModule.marketplaceListingService, "search").mockImplementation(m.search);
  m.search.mockResolvedValue({ listings: [canonical], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
});

describe("Corporate Portal uses the canonical marketplace", () => {
  it("asks the shared listing service the same question as the public marketplace API", async () => {
    await publicSearch(new NextRequest(`https://ridegrid.test/api/marketplace/search?${params}`));
    await adminBookingRead(new NextRequest(`https://ridegrid.test/api/corporate-admin/booking-search?${params}&employeeId=emp-1`), "booking-search", admin);
    expect(m.search).toHaveBeenCalledTimes(2);
    const [pub, portal] = m.search.mock.calls.map((c) => c[0]);
    for (const k of ["serviceType", "tripType", "pickupCity", "dropCity", "date", "time", "category"]) expect(portal[k]).toEqual(pub[k]);
  });

  it("returns the marketplace's own listing, vehicle, vendor, driver, package and fare - only the policy is layered on", async () => {
    const out = await adminBookingRead(new NextRequest(`https://ridegrid.test/api/corporate-admin/booking-search?${params}&employeeId=emp-1`), "booking-search", admin) as { listings: any[] };
    const l = out.listings[0];
    expect(l.id).toBe(canonical.id);
    expect(l.vehicle).toMatchObject({ make: "Toyota", model: "Innova", variant: "Crysta", registrationNumber: "KA01AB1234", seatingCapacity: 7, fuelType: "DIESEL", transmission: "MANUAL" });
    expect(l.vendor).toEqual({ companyName: "Sri Travels" });
    expect(l.driver).toEqual({ name: "Ramesh", verified: true });
    expect(l.pricing.pricingPackageId).toBe("pkg-1");
    expect(l.pricing.fare.finalPayable).toBe("10000.00");
    expect(l.policy).toMatchObject({ decision: expect.stringMatching(/ALLOWED|APPROVAL_REQUIRED|NOT_ALLOWED/) });
  });

  it("never invents listings when the marketplace has none", async () => {
    m.search.mockResolvedValue({ listings: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    const out = await adminBookingRead(new NextRequest(`https://ridegrid.test/api/corporate-admin/booking-search?${params}&employeeId=emp-1`), "booking-search", admin) as { listings: unknown[] };
    expect(out.listings).toEqual([]);
  });

  it("forwards paging so every marketplace result is reachable", async () => {
    await adminBookingRead(new NextRequest(`https://ridegrid.test/api/corporate-admin/booking-search?${params}&employeeId=emp-1&page=2`), "booking-search", admin);
    expect(m.search.mock.calls[0][0].page).toBe(2);
  });

  it("quotes through the central quote service for the selected employee's account", async () => {
    m.forPackage.mockResolvedValue({ id: "q1", expiresAt: new Date(Date.now() + 600000), snapshot: { vehicleId: "veh-1", vehicleCategoryId: "SUV", service: "OUTSTATION_ONE_WAY", finalPayable: "10000.00", tripDateTime: new Date(Date.now() + 3 * 86400000).toISOString(), route: { origin: "Pune", city: "" } } });
    const at = new Date(Date.now() + 3 * 86400000).toISOString();
    await adminBookingWrite("booking-quote", { traveller: { kind: "EMPLOYEE", employeeId: "emp-1" }, pricingPackageId: "pkg-1", at, idempotencyKey: "k1" }, admin);
    expect(m.forPackage).toHaveBeenCalledWith("pkg-1", new Date(at), "user-1", true, "k1", undefined);
  });
});

describe("listing service pricing is order-preserving and bounded", () => {
  it("picks the cheapest package per vehicle and never prices more than 4 at once", async () => {
    const pkg = (id: string, vehicleId: string, baseFare: number) => ({
      id, vehicleId, isActive: true, packageType: "OUTSTATION_ONE_WAY", packageName: "Pune to Mumbai", fromCity: "Pune", toCity: "Mumbai", city: "Pune", pricingRuleId: "r", baseFare, includedKm: 100, includedHours: null,
      extraKmRate: null, extraHourRate: null, driverAllowance: null, nightCharge: null, tollCharge: null, parkingCharge: null, otherCharges: null, airportName: null, transferDirection: null, extraPickupCharge: null, extraDropCharge: null,
      pricingRule: { isActive: true, pricingType: "OUTSTATION", tripType: "ONEWAY", nightCharge: null, waitingCharge: null },
      vehicle: { id: vehicleId, deletedAt: null, status: "AVAILABLE", isVerified: true, category: "SUV", make: "T", model: "I", variant: null, registrationNumber: vehicleId,
        vendor: { deletedAt: null, suspendedAt: null, isApproved: true, user: { deletedAt: null, isActive: true } }, driver: { deletedAt: null, status: "ACTIVE", user: { deletedAt: null, isActive: true } } },
    });
    const pkgs = [pkg("a1", "v1", 1), pkg("a2", "v1", 2), pkg("a3", "v1", 3), pkg("b1", "v2", 4), pkg("b2", "v2", 5), pkg("b3", "v2", 6), pkg("c1", "v3", 7), pkg("c2", "v3", 8)];
    m.pricingPackage.findMany.mockResolvedValue(pkgs);
    // v1: a2 is cheapest. v2: b3 cheapest. v3: c1 cheapest. Slower calls finish later to prove ordering is not by completion time.
    const fare: Record<string, number> = { a1: 900, a2: 500, a3: 700, b1: 900, b2: 800, b3: 600, c1: 400, c2: 450 };
    let inFlight = 0, peak = 0;
    m.forPackage.mockImplementation(async (id: string) => {
      inFlight++; peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, id.startsWith("a") ? 15 : 3));
      inFlight--;
      return { id: null, expiresAt: new Date(), snapshot: { finalPayable: String(fare[id]), vendorFare: "0", calculationRule: {} } };
    });
    m.vehicleFind.mockImplementation(async (where: { id: { in: string[] } }) => where.id.in.map((id) => ({ id, driverId: `d-${id}`, trips: [], homeCity: "Pune", year: 2022, fuelType: "D", transmission: "M", seatingCapacity: 7, luggageCapacity: 3, color: null, rating: 4, totalTrips: 1, isVerified: true, status: "AVAILABLE", vendor: { id: "ven", companyName: "V", isApproved: true, verifiedAt: new Date() }, driver: { id: `d-${id}`, firstName: "Ram", user: { isVerified: true } },
      registrationNumber: id, make: "T", model: "I", variant: null, category: "SUV" })));
    const svc = new MarketplaceListingService();
    const out = await svc.search({ serviceType: "OUTSTATION", tripType: "ONEWAY", pickupCity: "Pune", dropCity: "Mumbai", date: future, time: "10:00" });
    const chosen = Object.fromEntries(out.listings.map((l: any) => [l.id, l.pricing.pricingPackageId]));
    expect(chosen).toEqual({ v1: "a2", v2: "b3", v3: "c1" });
    expect(out.listings.map((l: any) => l.id)).toEqual(["v3", "v1", "v2"]); // sorted by price, as before
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });
});
