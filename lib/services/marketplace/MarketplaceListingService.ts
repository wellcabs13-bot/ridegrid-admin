import { Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleRepository } from "@/lib/repositories/vehicle";

export interface MarketplaceListingFilters {
  serviceType?: string; tripType?: string; pickupCity?: string; dropCity?: string;
  city?: string; packageName?: string; airport?: string; airportDirection?: string;
  airportSlab?: string; category?: string; date?: string; time?: string;
  search?: string; page?: number; limit?: number;
}

const norm = (v?: string | null) => String(v ?? "").trim().toLowerCase();
const same = (a?: string | null, b?: string | null) => norm(a) === norm(b);
const num = (v: unknown) => v == null ? null : Number(v);

function route(name: string, from: string | null, to: string | null) {
  if (from?.trim() && to?.trim()) return { fromCity: from.trim(), toCity: to.trim() };
  const m = name.trim().match(/^(.+?)\s+to\s+(.+)$/i);
  return { fromCity: m?.[1]?.trim() || null, toCity: m?.[2]?.trim() || null };
}

export class MarketplaceListingService {
  async search(f: MarketplaceListingFilters = {}) {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const serviceType = f.serviceType?.trim() || "";
    const tripType = f.tripType?.trim() || "";
    const pickupCity = f.pickupCity?.trim() || f.city?.trim() || "";
    const dropCity = f.dropCity?.trim() || "";
    const packageName = f.packageName?.trim() || "";
    const airport = f.airport?.trim() || "";
    const airportDirection = f.airportDirection?.trim() || "";
    const airportSlab = f.airportSlab?.trim() || "";
    const category = f.category?.trim() || "";
    const search = f.search?.trim() || "";

    let pickupDateTime: Date | undefined;
    if (f.date && f.time) {
      const d = new Date(`${f.date}T${f.time}:00`);
      if (!Number.isNaN(d.getTime())) pickupDateTime = d;
    }

    if (!serviceType) return { search: f, listings: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    // 1) PricingPackage is the master. Resolve pricing first, without vehicle filters.
    const packages = await prisma.pricingPackage.findMany({
      where: {
        isActive: true,
        pricingRule: {
          isActive: true,
          pricingType: serviceType as any,
          ...(serviceType === "OUTSTATION" && tripType ? { tripType: tripType as any } : {}),
        },
      },
      include: {
        pricingRule: true,
        vehicle: { include: { vendor: { include: { user: true } }, driver: { include: { user: true } } } },
      },
      orderBy: { baseFare: "asc" },
    });

    const matching = packages.filter((pkg) => {
      const r = serviceType === "OUTSTATION"
        ? route(pkg.packageName, pkg.fromCity, pkg.toCity)
        : { fromCity: pkg.fromCity, toCity: pkg.toCity };

      if (serviceType === "OUTSTATION") {
        if (!tripType || !pickupCity || !dropCity || !same(r.fromCity, pickupCity) || !same(r.toCity, dropCity)) return false;
      } else if (pickupCity && pkg.city && !same(pkg.city, pickupCity)) return false;

      if (packageName && !same(pkg.packageName, packageName)) return false;
      if (airport && !same(pkg.airportName, airport)) return false;
      if (airportDirection && !same(pkg.transferDirection, airportDirection)) return false;
      if (airportSlab && String(pkg.includedKm ?? "") !== airportSlab) return false;
      return true;
    });

    // 2) The matched PricingPackage identifies its vehicle. Validate vehicle/vendor/driver separately.
    const eligible = matching.filter((pkg) => {
      const v = pkg.vehicle;
      if (!v || v.deletedAt || v.status !== VehicleStatus.AVAILABLE || !v.isVerified) return false;

      const vendor = v.vendor;
      if (!vendor || vendor.deletedAt || !vendor.isApproved || !vendor.user || vendor.user.deletedAt || !vendor.user.isActive) return false;

      const driver = v.driver;
      if (!driver || driver.deletedAt || driver.status !== "ACTIVE" || !driver.user || driver.user.deletedAt || !driver.user.isActive) return false;

      if (category && norm(v.category) !== norm(category)) return false;
      if (search && ![v.make, v.model, v.variant, v.registrationNumber].some(x => norm(x).includes(norm(search)))) return false;
      return true;
    });

    // 3) One cheapest matching active pricing package per vehicle.
    const byVehicle = new Map<string, (typeof eligible)[number]>();
    for (const pkg of eligible) {
      const old = byVehicle.get(pkg.vehicleId);
      if (!old || Number(pkg.baseFare) < Number(old.baseFare)) byVehicle.set(pkg.vehicleId, pkg);
    }

    const ids = [...byVehicle.keys()];
    if (!ids.length) return { search: f, listings: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    // 4) Availability is checked only after pricing + vehicle relationship is resolved.
    const vehicles = await vehicleRepository.findMarketplaceAvailable(
      { id: { in: ids }, deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true } as Prisma.VehicleWhereInput,
      pickupDateTime
    );

    const listings = vehicles.map((v) => {
      const pkg = byVehicle.get(v.id);
      if (!pkg) return null;
      const r = pkg.pricingRule.pricingType === "OUTSTATION" ? route(pkg.packageName, pkg.fromCity, pkg.toCity) : { fromCity: pkg.fromCity, toCity: pkg.toCity };

      return {
        id: v.id,
        vehicle: {
          id: v.id, registrationNumber: v.registrationNumber, make: v.make, model: v.model,
          variant: v.variant, year: v.year, category: v.category, fuelType: v.fuelType,
          transmission: v.transmission, seatingCapacity: v.seatingCapacity,
          luggageCapacity: v.luggageCapacity, color: v.color,
        },
        location: { city: v.homeCity },
        pricing: {
          pricingPackageId: pkg.id, pricingRuleId: pkg.pricingRuleId,
          pricingType: pkg.pricingRule.pricingType, tripType: pkg.pricingRule.tripType,
          packageType: pkg.packageType, packageName: pkg.packageName, city: pkg.city,
          fromCity: r.fromCity, toCity: r.toCity, baseFare: Number(pkg.baseFare),
          includedHours: pkg.includedHours, includedKm: pkg.includedKm,
          extraKmRate: num(pkg.extraKmRate), extraHourRate: num(pkg.extraHourRate),
          driverAllowance: num(pkg.driverAllowance),
          nightCharge: num(pkg.nightCharge) ?? num(pkg.pricingRule.nightCharge),
          waitingCharge: num(pkg.pricingRule.waitingCharge),
          tollCharge: num(pkg.tollCharge), parkingCharge: num(pkg.parkingCharge),
          otherCharges: num(pkg.otherCharges), airportName: pkg.airportName,
          transferDirection: pkg.transferDirection,
          extraPickupCharge: num(pkg.extraPickupCharge), extraDropCharge: num(pkg.extraDropCharge),
        },
        vendor: v.vendor ? { id: v.vendor.id, companyName: v.vendor.companyName, name: v.vendor.user?.name || "", mobile: v.vendor.user?.mobile || null } : null,
        driver: v.driver ? { id: v.driver.id, name: v.driver.user?.name || `${v.driver.firstName} ${v.driver.lastName}`.trim(), mobile: v.driver.user?.mobile || null } : null,
        marketplace: { rating: v.rating, totalTrips: v.totalTrips, verified: v.isVerified, status: v.status, available: true },
      };
    }).filter(Boolean) as any[];

    listings.sort((a, b) => Number(a.pricing.baseFare) - Number(b.pricing.baseFare));
    const total = listings.length;
    const start = (page - 1) * limit;

    return {
      search: { serviceType, tripType: serviceType === "OUTSTATION" ? tripType : null, pickupCity: pickupCity || null, dropCity: dropCity || null, packageName: packageName || null, airport: airport || null, airportDirection: airportDirection || null, airportSlab: airportSlab || null, category: category || null, date: f.date || null, time: f.time || null },
      listings: listings.slice(start, start + limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
export const marketplaceListingService = new MarketplaceListingService();
