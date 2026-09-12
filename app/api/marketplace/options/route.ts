import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function key(...values: unknown[]) {
  return values.map((value) => clean(value).toLowerCase()).join("|");
}

/*
 * Current Pricing data stores Outstation route in packageName
 * (example: "Pune to Nashik") while fromCity/toCity may be null.
 *
 * Marketplace therefore reads the saved PricingPackage and derives
 * the route from that saved package name. Nothing is hardcoded.
 */
function deriveRoute(packageName: string, fromCity: string | null, toCity: string | null) {
  if (clean(fromCity) && clean(toCity)) {
    return {
      fromCity: clean(fromCity),
      toCity: clean(toCity),
    };
  }

  const match = clean(packageName).match(/^(.+?)\s+to\s+(.+)$/i);

  return {
    fromCity: match?.[1]?.trim() || null,
    toCity: match?.[2]?.trim() || null,
  };
}

export async function GET() {
  try {
    const packages = await prisma.pricingPackage.findMany({
      where: {
        isActive: true,
        pricingRule: {
          isActive: true,
        },
      },
      select: {
        id: true,
        packageType: true,
        packageName: true,
        city: true,
        fromCity: true,
        toCity: true,
        includedHours: true,
        includedKm: true,
        airportName: true,
        transferDirection: true,
        pricingRule: {
          select: {
            pricingType: true,
            tripType: true,
            vehicleCategory: true,
          },
        },
      },
      orderBy: [
        { packageType: "asc" },
        { packageName: "asc" },
      ],
    });

    const unique = new Map<string, any>();

    for (const item of packages) {
      const route =
        item.pricingRule.pricingType === "OUTSTATION"
          ? deriveRoute(item.packageName, item.fromCity, item.toCity)
          : { fromCity: item.fromCity, toCity: item.toCity };

      const row = {
        id: item.id,
        pricingType: item.pricingRule.pricingType,
        tripType: item.pricingRule.tripType,
        vehicleCategory: item.pricingRule.vehicleCategory,
        packageType: item.packageType,
        packageName: item.packageName,
        city: item.city,
        fromCity: route.fromCity,
        toCity: route.toCity,
        includedHours: item.includedHours,
        includedKm: item.includedKm,
        airportName: item.airportName,
        transferDirection: item.transferDirection,
      };

      const k = key(
        row.pricingType,
        row.tripType,
        row.vehicleCategory,
        row.packageType,
        row.packageName,
        row.city,
        row.fromCity,
        row.toCity,
        row.airportName,
        row.transferDirection,
        row.includedKm
      );

      if (!unique.has(k)) unique.set(k, row);
    }

    const data = Array.from(unique.values());

    return NextResponse.json({
      success: true,
      data,
      serviceTypes: Array.from(
        new Set(data.map((item) => item.pricingType))
      ),
      tripTypes: Array.from(
        new Set(
          data
            .filter((item) => item.pricingType === "OUTSTATION")
            .map((item) => item.tripType)
        )
      ).map((tripType) => ({
        pricingType: "OUTSTATION",
        tripType,
      })),
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/marketplace/options:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load live pricing options.",
      },
      { status: 500 }
    );
  }
}
