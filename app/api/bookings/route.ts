import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        vendor: {
          include: {
            user: true,
          },
        },
        corporate: true,
        vehicle: true,
        driver: {
          include: {
            user: true,
          },
        },
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
        couponUsages: {
          include: {
            coupon: true,
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("GET /api/bookings error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings.",
      },
      { status: 500 }
    );
  }
}
