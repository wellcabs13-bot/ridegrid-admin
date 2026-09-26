import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

function logicalService(service: string) {
  if (service === "OUTSTATION_ONE_WAY") return "ONE_WAY";
  if (service === "OUTSTATION_ROUND_TRIP") return "ROUNDTRIP";
  if (service === "LOCAL_HOURLY") return "LOCAL";
  return null;
}

export async function GET() {
  try {
    const now = new Date();

    const rates = await prisma.pricingRateVersion.findMany({
      where: {
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
            deletedAt: null,
            status: "AVAILABLE",
            isVerified: true,
            vendor: {
              deletedAt: null,
              isApproved: true,
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
      },
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

    const unique = new Map<string, any>();

    for (const rate of rates) {
      const pkg = rate.pricingPackage;
      if (!pkg) continue;

      const service = logicalService(rate.service);
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

    return NextResponse.json({
      success: true,
      data,
      tours: [],
      toursConfigured: false,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/marketplace/options:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load current marketplace pricing.",
      },
      { status: 500 }
    );
  }
}
