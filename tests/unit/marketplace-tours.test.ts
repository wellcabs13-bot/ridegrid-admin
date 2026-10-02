import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  forPackage: vi.fn(),
  findMarketplaceAvailable: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { pricingPackage: { findMany: mocks.findMany } } }));
vi.mock("@/lib/services/pricing/QuoteService", () => ({ quoteService: { forPackage: mocks.forPackage } }));
vi.mock("@/lib/repositories/vehicle", () => ({ vehicleRepository: { findMarketplaceAvailable: mocks.findMarketplaceAvailable } }));
vi.mock("@/lib/services/pricing/publicSnapshot", () => ({ publicSnapshot: (s: unknown) => s }));
vi.mock("@/lib/services/marketplace/BookingAvailabilityService", () => ({
  reservationWindowFromDate: () => ({ start: new Date("2026-11-01T00:00:00Z"), end: new Date("2026-11-02T00:00:00Z") }),
  findUnavailableAssignments: async () => ({ unavailableVehicleIds: new Set(), unavailableDriverIds: new Set() }),
}));

import { PricingError } from "@/lib/services/pricing/engine";
import { marketplaceListingService } from "@/lib/services/marketplace/MarketplaceListingService";

const TOUR = "Pune to Ashtavinayak Darshan";
const user = { isActive: true, deletedAt: null };
const vehicle = (id: string) => ({ id, deletedAt: null, status: "AVAILABLE", isVerified: true, category: "SEDAN", make: "Maruti", model: "Dzire",
  vendor: { id: "v1", deletedAt: null, suspendedAt: null, isApproved: true, user }, driver: { id: `d-${id}`, deletedAt: null, status: "ACTIVE", user } });
const pkg = (id: string, vehicleId: string, packageType = "TOUR_PACKAGE", packageName = TOUR) => ({ id, vehicleId, packageType, packageName, city: "Pune", fromCity: "Pune", toCity: "Ashtavinayak Darshan",
  pricingRuleId: "r1", pricingRule: { pricingType: "OUTSTATION", tripType: "ROUNDTRIP" }, vehicle: vehicle(vehicleId) });
const quote = (fare: string, notes?: string) => ({ snapshot: { finalPayable: fare, vendorFare: fare, calculationRule: { includedHours: "0", includedKm: "0", perKm: "0", perHour: "0", operational: { service: "TOUR", driverAllowancePerDay: "0", notes } } } });

describe("Tour marketplace search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMarketplaceAvailable.mockImplementation(async (where: { id: { in: string[] } }) => where.id.in.map(id => ({ id, driverId: `d-${id}`, trips: [], homeCity: "Pune", ...vehicle(id), seatingCapacity: 4, rating: 0, totalTrips: 0, vendor: { id: "v1", companyName: "Fleet", isApproved: true, verifiedAt: new Date() }, driver: { id: `d-${id}`, firstName: "Ravi", user: { isVerified: true } } })));
  });

  it("lists only cars with a live price for the selected tour, with tour notes", async () => {
    mocks.findMany.mockResolvedValue([
      pkg("priced", "car-priced"),
      pkg("deactivated", "car-deactivated"),
      pkg("other-tour", "car-other", "TOUR_PACKAGE", "Pune to Shirdi + Shani Shingnapur"),
      pkg("route", "car-route", "OUTSTATION_ROUND_TRIP", "Pune to Mumbai"),
    ]);
    mocks.forPackage.mockImplementation(async (id: string) => {
      if (id === "deactivated") throw new PricingError("NOT_FOUND", "No active price", 404);
      return quote("6500.00", "Covers all eight temples; tolls extra.");
    });

    const result = await marketplaceListingService.search({ serviceType: "TOUR_PACKAGE", pickupCity: "Pune", packageName: TOUR, date: "2026-11-01", time: "07:00" });

    expect(result.listings.map((l: { id: string }) => l.id)).toEqual(["car-priced"]);
    expect(result.listings[0].pricing).toMatchObject({ packageType: "TOUR_PACKAGE", packageName: TOUR, finalPayable: 6500, notes: "Covers all eight temples; tolls extra." });
  });

  it("never lists tour packages in point-to-point outstation searches", async () => {
    mocks.findMany.mockResolvedValue([pkg("tour", "car-tour")]);
    mocks.forPackage.mockResolvedValue(quote("6500.00"));
    const result = await marketplaceListingService.search({ serviceType: "OUTSTATION", tripType: "ROUNDTRIP", pickupCity: "Pune", dropCity: "Ashtavinayak Darshan", days: "1" });
    expect(result.listings).toEqual([]);
  });
});
