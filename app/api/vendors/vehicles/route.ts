import { legacyVendorId } from "@/lib/vendor-mobile/legacy";
import { vendorFailure } from "@/lib/vendor-mobile/access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const vendorId = await legacyVendorId(req);

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        vendorId,
        deletedAt: null,
      },
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
          },
        },
        bookings: { where: { vendorId, deletedAt: null },
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
        documents: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const statistics = {
      total: vehicles.length,
      available: vehicles.filter(
        (v) => v.status === "AVAILABLE"
      ).length,
      onTrip: vehicles.filter(
        (v) => v.status === "ON_TRIP"
      ).length,
      maintenance: vehicles.filter(
        (v) => v.status === "MAINTENANCE"
      ).length,
    };

    return NextResponse.json({
      success: true,
      statistics,
      data: vehicles,
    });
  } catch (error) { return vendorFailure(error); }
}
