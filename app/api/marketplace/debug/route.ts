import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function routeFromName(name: string, from: string | null, to: string | null) {
  if (from?.trim() && to?.trim()) return { from: from.trim(), to: to.trim(), source: "fields" };
  const m = name.trim().match(/^(.+?)\s+to\s+(.+)$/i);
  return { from: m?.[1]?.trim() || "", to: m?.[2]?.trim() || "", source: "packageName" };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pickup = url.searchParams.get("pickupCity") || "Pune";
    const drop = url.searchParams.get("dropCity") || "Mumbai";
    const tripType = url.searchParams.get("tripType") || "ONEWAY";

    const packages = await prisma.pricingPackage.findMany({
      where: {
        isActive: true,
        pricingRule: {
          isActive: true,
          pricingType: "OUTSTATION" as any,
          tripType: tripType as any,
        },
      },
      include: {
        pricingRule: true,
        vehicle: {
          include: {
            vendor: { include: { user: true } },
            driver: { include: { user: true } },
          },
        },
      },
      orderBy: { baseFare: "asc" },
    });

    const rows = packages.map((p) => {
      const r = routeFromName(p.packageName, p.fromCity, p.toCity);
      const v = p.vehicle;
      const vendor = v?.vendor;
      const driver = v?.driver;

      const routeMatch =
        norm(r.from) === norm(pickup) && norm(r.to) === norm(drop);

      const checks = {
        pricingActive: p.isActive,
        ruleActive: p.pricingRule.isActive,
        routeMatch,
        vehicleLinked: !!v,
        vehicleAvailable: v?.status === "AVAILABLE",
        vehicleVerified: v?.isVerified === true,
        vehicleNotDeleted: !v?.deletedAt,
        vendorLinked: !!vendor,
        vendorApproved: vendor?.isApproved === true,
        vendorNotDeleted: !vendor?.deletedAt,
        vendorUserActive: vendor?.user?.isActive === true,
        vendorUserNotDeleted: !vendor?.user?.deletedAt,
        driverLinked: !!driver,
        driverActive: driver?.status === "ACTIVE",
        driverNotDeleted: !driver?.deletedAt,
        driverUserActive: driver?.user?.isActive === true,
        driverUserNotDeleted: !driver?.user?.deletedAt,
      };

      return {
        pricingPackageId: p.id,
        packageName: p.packageName,
        baseFare: Number(p.baseFare),
        vehicleId: p.vehicleId,
        vehicle: v
          ? {
              registrationNumber: v.registrationNumber,
              category: v.category,
              status: v.status,
              isVerified: v.isVerified,
            }
          : null,
        vendor: vendor
          ? { companyName: vendor.companyName, approved: vendor.isApproved }
          : null,
        driver: driver
          ? {
              name: driver.user?.name || `${driver.firstName} ${driver.lastName}`.trim(),
              status: driver.status,
            }
          : null,
        derivedRoute: r,
        checks,
        passesAll: Object.values(checks).every(Boolean),
      };
    });

    return NextResponse.json({
      success: true,
      requested: { pickupCity: pickup, dropCity: drop, tripType },
      count: rows.length,
      matchingRouteCount: rows.filter((r) => r.checks.routeMatch).length,
      fullyEligibleCount: rows.filter((r) => r.passesAll).length,
      packages: rows,
    });
  } catch (error) {
    console.error("Marketplace debug:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Debug failed" },
      { status: 500 }
    );
  }
}
