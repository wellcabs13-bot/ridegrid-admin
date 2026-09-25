import { notifyAssignedDriver } from "@/lib/services/booking/DriverNotification";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";

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
              ...(requestedStatus === "CANCELLED"
                ? {
                    cancelledBy: user.id,
                    cancelledAt: new Date(),
                  }
                : {}),
            },
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

    return NextResponse.json({
      success: true,
      message: "Booking status updated successfully.",
      data: updatedBooking,
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
