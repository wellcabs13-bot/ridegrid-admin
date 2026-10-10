import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileCustomer, mobileFailure } from "@/lib/customer-mobile";
import { trustedTripLocation } from "@/lib/services/booking/TrustedLocationService";
export async function GET(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false }, { status: 400 });
    const b = await prisma.booking.findFirst({ where: { id, deletedAt: null, customer: { userId: a.user!.id, deletedAt: null } }, select: { status: true, trip: { select: { status: true, deletedAt: true, driverAssignedAt: true, driverAcceptedAt: true, arrivedPickupAt: true, tripStartedAt: true, tripCompletedAt: true } } } });
    if (!b) return NextResponse.json({ success: false }, { status: 404 });
    const location = await trustedTripLocation(id, b);
    return NextResponse.json({ success: true, data: { status: b.status, trip: b.trip?.deletedAt ? null : b.trip, liveTracking: !!location, location } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
