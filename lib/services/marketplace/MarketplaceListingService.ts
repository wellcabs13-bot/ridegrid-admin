import { quoteService } from "@/lib/services/pricing/QuoteService";
import { PricingError, SERVICES, decimal } from "@/lib/services/pricing/engine";
import { Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleRepository } from "@/lib/repositories/vehicle";
import {
  findUnavailableAssignments,
  reservationWindowFromDate,
} from "@/lib/services/marketplace/BookingAvailabilityService";

export interface MarketplaceListingFilters {
  serviceType?: string; tripType?: string; pickupCity?: string; dropCity?: string;
  city?: string; packageName?: string; airport?: string; airportDirection?: string;
  airportSlab?: string; category?: string; date?: string; time?: string; days?: string;
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
    const visitCities =
      tripType === "ROUNDTRIP"
        ? dropCity.split("|").map(value => value.trim()).filter(Boolean)
        : dropCity
          ? [dropCity]
          : [];
    const packageName = f.packageName?.trim() || "";
    const airport = f.airport?.trim() || "";
    const airportDirection = f.airportDirection?.trim() || "";
    const airportSlab = f.airportSlab?.trim() || "";
    const category = f.category?.trim() || "";
    const search = f.search?.trim() || "";

    const requestedDays = Number(f.days || "1");

    const roundtripDays =
      serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
        ? requestedDays
        : 1;

    if (
      serviceType === "OUTSTATION" &&
      tripType === "ROUNDTRIP" &&
      (!Number.isInteger(roundtripDays) || roundtripDays < 1)
    ) {
      throw new PricingError(
        "INVALID_INPUT",
        "Roundtrip days must be a positive whole number",
        400
      );
    }

    const quoteTime =
      f.time ||
      (serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
        ? "12:00"
        : "");

    let pickupDateTime: Date | undefined;
    if (f.date && quoteTime) {
      const d = new Date(`${f.date}T${quoteTime}:00+05:30`);
      if (!Number.isNaN(d.getTime())) pickupDateTime = d;
    }

    const availabilityWindow = f.date
      ? reservationWindowFromDate(
          f.date,
          serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
            ? roundtripDays
            : 1
        )
      : undefined;

    if (!serviceType) return { search: f, listings: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    // 1) PricingPackage is the master. Resolve pricing first, without vehicle filters.
    const packages = await prisma.pricingPackage.findMany({
      where: {
        isActive: true,
        pricingRule: {
          isActive: true,
          ...((SERVICES as readonly string[]).includes(serviceType) ? {} : { pricingType: serviceType as any }),
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
      if ((SERVICES as readonly string[]).includes(serviceType) && pkg.packageType !== serviceType) return false;
      const r = serviceType === "OUTSTATION"
        ? route(pkg.packageName, pkg.fromCity, pkg.toCity)
        : { fromCity: pkg.fromCity, toCity: pkg.toCity };

      if (serviceType === "OUTSTATION") {
        if (
          !tripType ||
          !pickupCity ||
          !visitCities.length ||
          !same(r.fromCity, pickupCity) ||
          !visitCities.some(city => same(r.toCity, city))
        ) return false;
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

        // A multi-city Roundtrip must have an approved/current pricing identity
    // for every selected visit city on the same exact vehicle.
    let eligibleForQuote = eligible;

    if (
      serviceType === "OUTSTATION" &&
      tripType === "ROUNDTRIP" &&
      visitCities.length > 1
    ) {
      const coverage = new Map<string, Set<string>>();

      for (const pkg of eligible) {
        const r = route(pkg.packageName, pkg.fromCity, pkg.toCity);
        if (!r.toCity) continue;

        const set = coverage.get(pkg.vehicleId) || new Set<string>();

        for (const city of visitCities) {
          if (same(r.toCity, city)) set.add(norm(city));
        }

        coverage.set(pkg.vehicleId, set);
      }

      eligibleForQuote = eligible.filter(
        pkg => coverage.get(pkg.vehicleId)?.size === visitCities.length
      );
    }
    // 3) One cheapest matching active pricing package per vehicle.
    const byVehicle = new Map<string, (typeof eligible)[number]>();
    const quotes = new Map<string, Awaited<ReturnType<typeof quoteService.forPackage>>>();
    for (const pkg of eligibleForQuote) {
      try {
        const quote = await quoteService.forPackage(
          pkg.id,
          pickupDateTime || new Date(),
          "listing-preview",
          false,
          undefined,
          serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
            ? String(roundtripDays)
            : undefined
        );
        quotes.set(pkg.id,quote);
        const old = byVehicle.get(pkg.vehicleId);
        const multiCityRoundtrip =
          serviceType === "OUTSTATION" &&
          tripType === "ROUNDTRIP" &&
          visitCities.length > 1;

        const replace =
          !old ||
          (multiCityRoundtrip
            ? decimal(quote.snapshot.finalPayable).gt(
                quotes.get(old.id)!.snapshot.finalPayable
              )
            : decimal(quote.snapshot.finalPayable).lt(
                quotes.get(old.id)!.snapshot.finalPayable
              ));

        if (replace) byVehicle.set(pkg.vehicleId, pkg);
      } catch(error) { if (!(error instanceof PricingError)) throw error; }
    }

    const ids = [...byVehicle.keys()];
    if (!ids.length) return { search: f, listings: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    // 4) Availability is checked only after pricing + vehicle relationship is resolved.
    const vehicles = await vehicleRepository.findMarketplaceAvailable(
      { id: { in: ids }, deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true } as Prisma.VehicleWhereInput,
      undefined
    );

    let availableVehicles = vehicles;

    if (availabilityWindow) {
      const assignmentAvailability = await findUnavailableAssignments(
        prisma,
        {
          vehicleIds: vehicles.map((vehicle) => vehicle.id),
          driverIds: vehicles
            .map((vehicle) => vehicle.driverId)
            .filter((value): value is string => Boolean(value)),
          window: availabilityWindow,
        }
      );

      availableVehicles = vehicles.filter((vehicle) => {
        if (
          assignmentAvailability.unavailableVehicleIds.has(vehicle.id) ||
          (vehicle.driverId &&
            assignmentAvailability.unavailableDriverIds.has(vehicle.driverId))
        ) {
          return false;
        }

        const hasActiveTripConflict = vehicle.trips.some((trip) => {
          if (!trip.startTime || !trip.endTime) {
            return true;
          }

          return (
            trip.startTime < availabilityWindow.end &&
            trip.endTime > availabilityWindow.start
          );
        });

        return !hasActiveTripConflict;
      });
    }

    const listings = (await Promise.all(availableVehicles.map(async (v) => {
      const pkg = byVehicle.get(v.id);
      if (!pkg) return null;
      const r = pkg.pricingRule.pricingType === "OUTSTATION" ? route(pkg.packageName, pkg.fromCity, pkg.toCity) : { fromCity: pkg.fromCity, toCity: pkg.toCity };

      const quote = quotes.get(pkg.id)!;
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
          quote: quote.snapshot, finalPayable: Number(quote.snapshot.finalPayable),
          pricingPackageId: pkg.id, pricingRuleId: pkg.pricingRuleId,
          pricingType: pkg.pricingRule.pricingType, tripType: pkg.pricingRule.tripType,
          packageType: pkg.packageType, packageName: pkg.packageName, city: pkg.city,
          tripDays:
            serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
              ? roundtripDays
              : 1,
          fromCity: r.fromCity, toCity: r.toCity, baseFare: quote.snapshot.calculationRule.operational ? Number(quote.snapshot.vendorFare) : Number(pkg.baseFare),
          includedHours: quote.snapshot.calculationRule.operational ? Number(quote.snapshot.calculationRule.includedHours) : pkg.includedHours,
          includedKm: quote.snapshot.calculationRule.operational
            ? Number(quote.snapshot.calculationRule.includedKm) *
              (serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
                ? roundtripDays
                : 1)
            : pkg.includedKm,
          includedKmPerDay: quote.snapshot.calculationRule.operational
            ? Number(quote.snapshot.calculationRule.includedKm)
            : pkg.includedKm,
          extraKmRate: quote.snapshot.calculationRule.operational ? Number(quote.snapshot.calculationRule.perKm) : num(pkg.extraKmRate),
          extraHourRate: quote.snapshot.calculationRule.operational ? Number(quote.snapshot.calculationRule.perHour) : num(pkg.extraHourRate),
          driverAllowance: quote.snapshot.calculationRule.operational
            ? Number(
                quote.snapshot.calculationRule.operational.driverAllowancePerDay
              ) *
              (serviceType === "OUTSTATION" && tripType === "ROUNDTRIP"
                ? roundtripDays
                : 1)
            : num(pkg.driverAllowance),
          driverAllowancePerDay: quote.snapshot.calculationRule.operational
            ? Number(
                quote.snapshot.calculationRule.operational.driverAllowancePerDay
              )
            : num(pkg.driverAllowance),
          nightCharge: num(pkg.nightCharge) ?? num(pkg.pricingRule.nightCharge),
          waitingCharge: num(pkg.pricingRule.waitingCharge),
          tollCharge: num(pkg.tollCharge), parkingCharge: num(pkg.parkingCharge),
          otherCharges: num(pkg.otherCharges), airportName: pkg.airportName,
          transferDirection: pkg.transferDirection,
          extraPickupCharge: num(pkg.extraPickupCharge), extraDropCharge: num(pkg.extraDropCharge),
        },
        vendor: v.vendor ? { id: v.vendor.id, companyName: v.vendor.companyName, approved: v.vendor.isApproved, name: v.vendor.user?.name || "", mobile: v.vendor.user?.mobile || null } : null,
        driver: v.driver ? { id: v.driver.id, verified: v.driver.user?.isVerified === true, name: v.driver.user?.name || `${v.driver.firstName} ${v.driver.lastName}`.trim(), mobile: v.driver.user?.mobile || null } : null,
        marketplace: { rating: v.rating, totalTrips: v.totalTrips, verified: v.isVerified, status: v.status, available: true },
      };
    }))).filter(Boolean) as any[];

    listings.sort((a, b) => Number(a.pricing.finalPayable) - Number(b.pricing.finalPayable));
    const total = listings.length;
    const start = (page - 1) * limit;

    return {
      search: { serviceType, tripType: serviceType === "OUTSTATION" ? tripType : null, pickupCity: pickupCity || null, dropCity: dropCity || null, packageName: packageName || null, airport: airport || null, airportDirection: airportDirection || null, airportSlab: airportSlab || null, category: category || null, date: f.date || null, time: f.time || null, days: serviceType === "OUTSTATION" && tripType === "ROUNDTRIP" ? String(roundtripDays) : null },
      listings: listings.slice(start, start + limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
export const marketplaceListingService = new MarketplaceListingService();
