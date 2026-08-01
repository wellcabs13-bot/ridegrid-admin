import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");
    const vendorId = req.nextUrl.searchParams.get("vendorId");

    if (!customerId && !vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "customerId or vendorId is required.",
        },
        { status: 400 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(vendorId ? { vendorId } : {}),
      },

      include: {
        customer: true,
        vendor: true,
        vehicle: true,
        driver: true,
        trip: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      total: bookings.length,
      data: bookings,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch booking history.",
      },
      { status: 500 }
    );
  }
}