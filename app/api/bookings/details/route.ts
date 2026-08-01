import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const bookingId = req.nextUrl.searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        customer: true,
        vendor: true,
        driver: true,
        vehicle: true,
        trip: {
          include: {
            trackingLogs: {
              orderBy: {
                recordedAt: "desc",
              },
              take: 20,
            },
            smartReturn: true,
          },
        },
        payment: true,
        review: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking,
    });

  } catch (error) {
    console.error("Booking Details Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch booking details.",
      },
      { status: 500 }
    );
  }
}