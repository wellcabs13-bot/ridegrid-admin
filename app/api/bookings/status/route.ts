import { notifyAssignedDriver } from "@/lib/services/booking/DriverNotification";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { BookingAdminError, cancelBooking } from "@/lib/services/admin/BookingAdminService";
import { emitRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["TRIP_STARTED", "CANCELLED"],
  TRIP_STARTED: ["TRIP_COMPLETED", "CANCELLED"],
  TRIP_COMPLETED: [],
  CANCELLED: [],
};

const STATUS_ACTION: Record<string, string> = {
  CONFIRMED: "STATUS_CHANGED",
  DRIVER_ASSIGNED: "ASSIGNED",
  TRIP_STARTED: "STATUS_CHANGED",
  TRIP_COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export async function PATCH(request: NextRequest) {
  try {
    const access = await requestPermission(request, Permission.BOOKING_UPDATE); if (access.denied) return access.denied;
    const user = access.user!;

    const body = await request.json();

    const bookingId = body.bookingId;
    const requestedStatus = body.status;

    if (
      typeof bookingId !== "string" ||
      !bookingId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof requestedStatus !== "string" ||
      !ALLOWED_TRANSITIONS[requestedStatus]
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking status.",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        bookingNumber: true,
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

    if (booking.status === requestedStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking is already in this status.",
        },
        { status: 409 }
      );
    }

    const allowed =
      ALLOWED_TRANSITIONS[booking.status] ?? [];

    if (!allowed.includes(requestedStatus)) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Invalid booking transition: ${booking.status} → ${requestedStatus}.`,
        },
        { status: 409 }
      );
    }

    // Cancellation must restore credit / record refunds, so it always uses the
    // central workflow (which also emits BOOKING_CANCELLED).
    if (requestedStatus === "CANCELLED") {
      const cancelAccess = await requestPermission(request, Permission.BOOKING_CANCEL);
      if (cancelAccess.denied) return cancelAccess.denied;
      const reason = typeof body.reason === "string" ? body.reason : "";
      try {
        return NextResponse.json({ success: true, message: "Booking cancelled.", data: await cancelBooking(booking.id, user.id, reason) });
      } catch (error) {
        if (error instanceof BookingAdminError) return NextResponse.json({ success: false, message: error.message }, { status: error.status });
        throw error;
      }
    }

    const action =
      STATUS_ACTION[requestedStatus] ?? "STATUS_CHANGED";

    const updatedBooking =
      await prisma.$transaction(async (tx) => {
        const updated =
          await tx.booking.update({
            where: {
              id: booking.id,
            },
            data: {
              status: requestedStatus as any,
            },
            select: { id: true, bookingNumber: true, status: true, customerId: true, vendorId: true, driverId: true, customer: { select: { userId: true } } },
          });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            previousStatus: booking.status as any,
            currentStatus: requestedStatus as any,
            action: action as any,
            changedBy: user.id,
            remarks:
              `Booking status changed from ${booking.status} to ${requestedStatus}.`,
          },
        });

        await notifyAssignedDriver(tx, booking.id, "Booking status updated");
        return updated;
      });

    if (updatedBooking.status === "TRIP_COMPLETED")
      await emitRideGridEvent({
        type: AutomationTrigger.TRIP_COMPLETED, module: "BOOKING", bookingId: updatedBooking.id, userId: updatedBooking.customer.userId,
        customerId: updatedBooking.customerId, vendorId: updatedBooking.vendorId, driverId: updatedBooking.driverId ?? undefined,
        metadata: { bookingNumber: updatedBooking.bookingNumber, actorId: user.id },
      });

    return NextResponse.json({
      success: true,
      message: "Booking status updated successfully.",
      data: { id: updatedBooking.id, bookingNumber: updatedBooking.bookingNumber, status: updatedBooking.status },
    });
  } catch (error) {
    console.error(
      "PATCH /api/bookings/status error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update booking status.",
      },
      { status: 500 }
    );
  }
}
