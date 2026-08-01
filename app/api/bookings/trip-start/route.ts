import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "TRIP_STARTED",
      },
    });

    await prisma.trip.update({
      where: {
        bookingId,
      },
      data: {
        tripStatus: "STARTED",
        actualStartTime: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Unable to start trip." },
      { status: 500 }
    );
  }
}