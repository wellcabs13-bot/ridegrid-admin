import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, driverId } = await req.json();

    const booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        driverId,
        status: "DRIVER_ASSIGNED",
      },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        currentStatus: "DRIVER_ASSIGNED",
        action: "ASSIGNED",
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
        message: "Driver assignment failed.",
      },
      { status: 500 }
    );
  }
}