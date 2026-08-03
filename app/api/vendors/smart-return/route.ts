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

    const completedTrips = await prisma.trip.findMany({
      where: {
        vehicle: {
          vendorId,
        },
        status: "COMPLETED",
      },
      include: {
        vehicle: true,
        booking: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: completedTrips,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch smart return trips.",
      },
      { status: 500 }
    );
  }
}