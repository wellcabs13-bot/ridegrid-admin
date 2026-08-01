import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, distance, duration } = await req.json();

    const booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "TRIP_COMPLETED",
      },
    });

    await prisma.trip.update({
      where: {
        bookingId,
      },
      data: {
        tripStatus: "COMPLETED",
        actualEndTime: new Date(),
        actualDistance: distance,
        actualDuration: duration,
      },
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Unable to complete trip." },
      { status: 500 }
    );
  }
}