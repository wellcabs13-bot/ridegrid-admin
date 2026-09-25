import { driverGet } from "@/lib/driver-mobile/route";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { bookingScope, requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const access = await requestPermission(request, Permission.BOOKING_VIEW);
    if (access.denied) return access.denied;
    if (access.user!.role === "DRIVER") return driverGet(request, "trips");
    const bookings = await prisma.booking.findMany({
      where: {
        ...bookingScope(access.user!),
        deletedAt: null,
      },
      include: {
        trip: { select: { status: true, deletedAt: true, arrivedPickupAt: true, tripStartedAt: true, tripCompletedAt: true } },
        customer: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
          },
        },
        vendor: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
          },
        },
        corporate: true,
        vehicle: true,
        driver: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
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
