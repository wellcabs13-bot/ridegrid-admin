import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Current searchable marketplace options: approved, effective rate versions on active
// packages of verified, available cars whose vendor and driver are active. Shared by
// GET /api/marketplace/options and the server-rendered public homepage.
const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

function logicalService(service: string, includeTours: boolean) {
  if (service === "TOUR_PACKAGE") return includeTours ? "TOUR" : null;
  if (service === "OUTSTATION_ONE_WAY") return "ONE_WAY";
  if (service === "OUTSTATION_ROUND_TRIP") return "ROUNDTRIP";
  if (service === "LOCAL_HOURLY") return "LOCAL";
  return null;
}

// Current searchable supply: approved, effective rate versions on active packages of
// verified, available cars whose approved (unsuspended) vendor and active driver can
// operate. The one definition of "listed in the marketplace", also used to tell a
// vendor how many of its cars are live.
export function marketplaceRateWhere(now = new Date(), vendorId?: string): Prisma.PricingRateVersionWhereInput {
  return {
    status: "APPROVED",
    effectiveFrom: { lte: now },
    OR: [
      { effectiveTo: null },
      { effectiveTo: { gt: now } },
    ],
    pricingPackageId: { not: null },
    pricingPackage: {
      isActive: true,
      pricingRule: {
        isActive: true,
      },
      vehicle: {
        ...(vendorId ? { vendorId } : {}),
        deletedAt: null,
        status: "AVAILABLE",
        isVerified: true,
        vendor: {
          deletedAt: null,
          isApproved: true,
          suspendedAt: null,
          user: {
            deletedAt: null,
            isActive: true,
          },
        },
        driver: {
          is: {
            deletedAt: null,
            status: "ACTIVE",
            user: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      },
    },
  };
}

// Tours are opt-in so existing app clients keep receiving only the services they render.
export async function listMarketplaceOptions({ includeTours = false }: { includeTours?: boolean } = {}) {
  const now = new Date();

  const rates = await prisma.pricingRateVersion.findMany({
    where: marketplaceRateWhere(now),
    include: {
      pricingPackage: {
        include: {
          pricingRule: true,
          vehicle: {
            select: {
              id: true,
              category: true,
            },
          },
        },
      },
    },
    orderBy: [
      { service: "asc" },
      { createdAt: "desc" },
    ],
  });

  const unique = new Map<string, Record<string, unknown>>();

  for (const rate of rates) {
    const pkg = rate.pricingPackage;
    if (!pkg) continue;

    const service = logicalService(rate.service, includeTours);
    if (!service) continue;

    const row = {
      rateId: rate.id,
      pricingPackageId: pkg.id,
      service,
      canonicalService: rate.service,
      vehicleCategory: rate.vehicleCategory,

      city: clean(pkg.city || rate.city),
      fromCity: clean(pkg.fromCity || rate.origin),
      toCity: clean(pkg.toCity || rate.destination),

      packageName: clean(pkg.packageName),
      includedHours: pkg.includedHours,
      includedKm: pkg.includedKm,

      version: rate.version,
      effectiveFrom: rate.effectiveFrom,
    };

    const key = [
      row.service,
      row.vehicleCategory,
      row.city.toLowerCase(),
      row.fromCity.toLowerCase(),
      row.toCity.toLowerCase(),
      row.packageName.toLowerCase(),
    ].join("|");

    // Rates are ordered newest first.
    // Only expose one current option for the same searchable combination.
    if (!unique.has(key)) unique.set(key, row);
  }

  const data = Array.from(unique.values());
  return data;
}
