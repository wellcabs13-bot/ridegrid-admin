import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ============================================================
     * 1. AUTHENTICATION
     * ============================================================
     */

    const authorization =
      request.headers.get("authorization");

    const headerToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;

    const cookieToken =
      request.cookies.get(
        "ridegrid_access_token"
      )?.value ??
      request.cookies.get(
        "ridegrid-token"
      )?.value;

    const token =
      headerToken ?? cookieToken;

    const user =
      await authenticate(token);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    /*
     * ============================================================
     * 2. REQUEST VALIDATION
     * ============================================================
     */

    const body =
      await request.json();

    const {
      vendorId,
      vehicleId,
      driverId,
      pickupLocation,
      dropLocation,
      pickupDateTime,
      estimatedFare,
    } = body;

    if (
      typeof vendorId !== "string" ||
      !vendorId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof vehicleId !== "string" ||
      !vehicleId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof pickupLocation !== "string" ||
      !pickupLocation.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pickup location is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof dropLocation !== "string" ||
      !dropLocation.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Drop location is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof pickupDateTime !== "string" ||
      !pickupDateTime.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pickup date and time are required.",
        },
        { status: 400 }
      );
    }

    if (
      estimatedFare === undefined ||
      estimatedFare === null ||
      estimatedFare === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Estimated fare is required.",
        },
        { status: 400 }
      );
    }

    const fare =
      Number(estimatedFare);

    if (
      !Number.isFinite(fare) ||
      fare < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Estimated fare is invalid.",
        },
        { status: 400 }
      );
    }

    const pickupDate =
      new Date(pickupDateTime);

    if (
      Number.isNaN(
        pickupDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pickup date and time are invalid.",
        },
        { status: 400 }
      );
    }

    /*
     * Booking must be created for a future
     * journey.
     */
    if (
      pickupDate.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pickup date and time must be in the future.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * 3. CUSTOMER VALIDATION
     * ============================================================
     */

    const customer =
      await prisma.customer.findUnique({
        where: {
          userId: user.id,
        },
      });

    if (
      !customer ||
      customer.deletedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer profile not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================================
     * 4. VENDOR VALIDATION
     * ============================================================
     */

    const vendor =
      await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          deletedAt: null,
          isApproved: true,
        },
        select: {
          id: true,
          companyName: true,
          isApproved: true,
        },
      });

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected vendor is not approved or no longer available.",
        },
        { status: 409 }
      );
    }

    /*
     * ============================================================
     * 5. VEHICLE VALIDATION
     * ============================================================
     */

    const vehicle =
      await prisma.vehicle.findFirst({
        where: {
          id: vehicleId,
          vendorId: vendor.id,
          deletedAt: null,
          isVerified: true,
          status: "AVAILABLE",
        },
        include: {
          vendor: true,
          driver: true,
        },
      });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected vehicle is no longer available.",
        },
        { status: 409 }
      );
    }

    /*
     * ============================================================
     * 6. DRIVER VALIDATION
     * ============================================================
     *
     * The marketplace listing is authoritative for the
     * assigned driver. The client cannot substitute another
     * driver.
     */

    if (
      driverId &&
      vehicle.driverId !== driverId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected driver is not assigned to this vehicle.",
        },
        { status: 409 }
      );
    }

    /*
     * ============================================================
     * 7. VEHICLE/VENDOR OWNERSHIP VALIDATION
     * ============================================================
     */

    if (
      vehicle.vendorId !==
      vendor.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected vendor does not own this vehicle.",
        },
        { status: 409 }
      );
    }

    /*
     * ============================================================
     * 8. ATOMIC BOOKING CREATION
     * ============================================================
     *
     * Serializable isolation protects the booking transaction
     * from concurrent booking attempts.
     */

    const booking =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Re-check vehicle availability inside
           * the transaction.
           */
          const currentVehicle =
            await tx.vehicle.findFirst({
              where: {
                id: vehicle.id,
                vendorId: vendor.id,
                deletedAt: null,
                isVerified: true,
                status: "AVAILABLE",
              },
              select: {
                id: true,
                vendorId: true,
                driverId: true,
                status: true,
              },
            });

          if (!currentVehicle) {
            throw new BookingConflictError(
              "Selected vehicle is no longer available."
            );
          }

          /*
           * Re-check driver assignment inside
           * the transaction.
           */
          if (
            driverId &&
            currentVehicle.driverId !==
              driverId
          ) {
            throw new BookingConflictError(
              "Selected driver is no longer assigned to this vehicle."
            );
          }

          /*
           * Prevent another active booking from
           * using the same vehicle at the exact
           * same pickup time.
           *
           * Current schema does not contain journey
           * duration/endDateTime, so overlap detection
           * beyond the exact pickup timestamp must be
           * implemented when journey-duration fields
           * are introduced.
           */
          const conflictingBooking =
            await tx.booking.findFirst({
              where: {
                vehicleId:
                  currentVehicle.id,

                pickupDateTime:
                  pickupDate,

                deletedAt: null,

                status: {
                  in: [
                    "PENDING",
                    "CONFIRMED",
                    "DRIVER_ASSIGNED",
                    "TRIP_STARTED",
                  ],
                },
              },
              select: {
                id: true,
                bookingNumber: true,
                status: true,
              },
            });

          if (conflictingBooking) {
            throw new BookingConflictError(
              "This vehicle is already booked for the selected pickup time."
            );
          }

          /*
           * Create booking.
           */
          const createdBooking =
            await tx.booking.create({
              data: {
                customerId:
                  customer.id,

                vendorId:
                  currentVehicle.vendorId,

                vehicleId:
                  currentVehicle.id,

                driverId:
                  currentVehicle.driverId ??
                  null,

                pickupLocation:
                  pickupLocation.trim(),

                dropLocation:
                  dropLocation.trim(),

                pickupDateTime:
                  pickupDate,

                estimatedFare:
                  fare,
              },
            });

          /*
           * Create initial status history.
           */
          await tx.bookingStatusHistory.create(
            {
              data: {
                bookingId:
                  createdBooking.id,

                currentStatus:
                  "PENDING",

                action:
                  "CREATED",

                changedBy:
                  user.id,

                remarks:
                  "Marketplace booking created.",
              },
            }
          );

          return createdBooking;
        },
        {
          isolationLevel:
            "Serializable",
        }
      );

    /*
     * ============================================================
     * 9. SUCCESS RESPONSE
     * ============================================================
     */

    return NextResponse.json(
      {
        success: true,
        message:
          "Booking created successfully.",
        data: booking,
      },
      { status: 201 }
    );
  } catch (error) {
    /*
     * ============================================================
     * 10. BUSINESS CONFLICT
     * ============================================================
     */

    if (
      error instanceof
      BookingConflictError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 409 }
      );
    }

    /*
     * ============================================================
     * 11. DATABASE / SYSTEM ERROR
     * ============================================================
     */

    console.error(
      "POST /api/bookings/create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Booking creation failed.",
      },
      { status: 500 }
    );
  }
}

/**
 * Business-level booking conflict.
 *
 * This is intentionally separate from generic
 * database/system errors so the frontend can
 * distinguish "vehicle unavailable" from
 * "server failure".
 */
class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "BookingConflictError";
  }
}