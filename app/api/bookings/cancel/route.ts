import { notifyAssignedDriver } from "@/lib/services/booking/DriverNotification";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const access = await requestPermission(req, Permission.BOOKING_CANCEL);
    if (access.denied) return access.denied;
    const { bookingId, reason } = await req.json();
    if (typeof bookingId !== "string" || !bookingId || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ success: false, message: "Booking and cancellation reason are required." }, { status: 400 });
    }
    const cancelledBy = access.user!.id;

    const booking = await prisma.$transaction(async tx => {
    const booking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        cancelledBy,
        cancelledAt: new Date(),
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        currentStatus: "CANCELLED",
        action: "CANCELLED",
      },
    });

    await tx.trip.updateMany({ where: { bookingId, deletedAt: null }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await notifyAssignedDriver(tx, bookingId, "Booking cancelled");
    return booking;
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
        message: "Booking cancellation failed.",
      },
      {
        status: 500,
      }
    );
  }
}
