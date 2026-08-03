import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const vendorId = req.nextUrl.searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    const [
      vendor,
      totalVehicles,
      activeVehicles,
      totalDrivers,
      totalBookings,
      wallet,
      settlements,
    ] = await Promise.all([
      prisma.vendor.findUnique({
        where: {
          id: vendorId,
        },
        include: {
          user: true,
        },
      }),

      prisma.vehicle.count({
        where: {
          vendorId,
          deletedAt: null,
        },
      }),

      prisma.vehicle.count({
        where: {
          vendorId,
          deletedAt: null,
          status: "AVAILABLE",
        },
      }),

      prisma.driver.count({
        where: {
          vehicles: {
            some: {
              vendorId,
            },
          },
          deletedAt: null,
        },
      }),

      prisma.booking.count({
        where: {
          vendorId,
          deletedAt: null,
        },
      }),

      prisma.vendorWallet.findUnique({
        where: {
          vendorId,
        },
      }),

      prisma.vendorSettlement.findMany({
        where: {
          vendorId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        vendor,
        statistics: {
          totalVehicles,
          activeVehicles,
          totalDrivers,
          totalBookings,
        },
        wallet,
        settlements,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load vendor dashboard.",
      },
      { status: 500 }
    );
  }
}