import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      bookingId,
      customerId,
      vendorId,
      vehicleId,
      driverId,
      pickupLocation,
      dropLocation,
      pickupDateTime,
      estimatedFare,
    } = body;

    const booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        customerId,
        vendorId,
        vehicleId,
        driverId,
        pickupLocation,
        dropLocation,
        pickupDateTime: new Date(pickupDateTime),
        estimatedFare,
      },
    });

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Booking update failed",
      },
      { status: 500 }
    );
  }
}