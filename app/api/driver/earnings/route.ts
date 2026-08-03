import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const driverId = req.nextUrl.searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { success: false, message: "Driver ID is required." },
        { status: 400 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        driverId,
        status: "TRIP_COMPLETED",
      },
      select: {
        id: true,
        bookingNumber: true,
        driverPayout: true,
        pickupDateTime: true,
      },
      orderBy: {
        pickupDateTime: "desc",
      },
    });

    const totalEarnings = bookings.reduce(
      (sum, booking) => sum + Number(booking.driverPayout || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        totalEarnings,
        trips: bookings.length,
        bookings,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch earnings.",
      },
      {
        status: 500,
      }
    );
  }
}