import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, driverId, vehicleId } = await req.json();

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        driverId,
        vehicleId,
        status: "DRIVER_ASSIGNED",
      },
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Unable to assign driver." },
      { status: 500 }
    );
  }
}