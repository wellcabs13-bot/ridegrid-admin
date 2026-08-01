import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "VENDOR_ACCEPTED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking accepted successfully.",
      booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Unable to accept booking." },
      { status: 500 }
    );
  }
}