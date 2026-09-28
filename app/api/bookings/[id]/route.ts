import { requestPermission, bookingScope } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { driverGet } from "@/lib/driver-mobile/route";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingView, bookingViewSelect } from "@/lib/services/booking/BookingContactPolicy";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const access = await requestPermission(request, Permission.BOOKING_VIEW); if (access.denied) return access.denied;
    const { id } = await params;
    if (access.user!.role === "DRIVER") { const url = request.nextUrl.clone(); url.searchParams.set("id", id); return driverGet(new NextRequest(url, { headers: request.headers }), "trips"); }

    // Explicit, role-aware fields (see BookingContactPolicy): no vendor bank data,
    // driver identity documents, payout splits or gateway payloads.
    const booking = await prisma.booking.findFirst({
      where: {
        id, deletedAt: null, ...bookingScope(access.user!),
      },
      select: bookingViewSelect,
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
      data: bookingView(booking, access.user!),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch booking.",
      },
      { status: 500 }
    );
  }
}
