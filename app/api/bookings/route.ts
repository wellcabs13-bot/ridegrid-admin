import { driverGet } from "@/lib/driver-mobile/route";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { bookingScope, requestPermission } from "@/lib/request-access";
import { bookingView, bookingViewSelect } from "@/lib/services/booking/BookingContactPolicy";
import { Permission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const access = await requestPermission(request, Permission.BOOKING_VIEW);
    if (access.denied) return access.denied;
    if (access.user!.role === "DRIVER") return driverGet(request, "trips");
    // Same role-aware fields as GET /api/bookings/[id] (BookingContactPolicy): no raw
    // corporate, vehicle, transaction or coupon records, and contacts only per role.
    const rows = await prisma.booking.findMany({
      where: {
        ...bookingScope(access.user!),
        deletedAt: null,
      },
      select: bookingViewSelect,
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });
    const bookings = rows.map((b) => bookingView(b, access.user!));

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
