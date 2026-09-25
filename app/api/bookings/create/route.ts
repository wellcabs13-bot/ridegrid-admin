import { consumeQuote } from "@/lib/services/pricing/QuoteService";
import { json } from "@/lib/services/pricing/RateService";
import { PricingError } from "@/lib/services/pricing/engine";
import { pricingResponse } from "@/lib/services/pricing/access";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { PricingType,
  TripType, BookingSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { generateBookingNumber } from "@/lib/services/booking/BookingNumberService";
import {
  pricingService,
} from "@/lib/services/pricing/PricingService";
import {
  findBookingConflict,
  reservationWindowFromPickup,
  tripDaysFromSnapshot,
} from "@/lib/services/marketplace/BookingAvailabilityService";

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
      request.headers.get(
        "authorization"
      );

    const headerToken =
      authorization?.startsWith(
        "Bearer "
      )
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
     * This route predates the hardened marketplace
     * quote/booking flow (QuoteService + commitMarketplaceBooking)
     * and has no known frontend caller. It is restricted to
     * internal staff for manual/back-office booking creation
     * so it cannot be used by customers to bypass the
     * marketplace's quote consumption and conflict checks.
     */
    if (user.role !== "SUPER_ADMIN" && user.role !== "OPERATIONS") {
      return NextResponse.json(
        {
          success: false,
          message: "Not authorized.",
        },
        { status: 403 }
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
      distanceKm,
      durationHours,
      pricingType,
      tripType,
      pricingPackageId,
      couponId,
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
      typeof pickupLocation !==
        "string" ||
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
      typeof dropLocation !==
        "string" ||
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
      typeof pickupDateTime !==
        "string" ||
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

    const pickupDate =
      new Date(
        pickupDateTime
      );

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
     * estimatedFare is retained as a compatibility
     * field for existing clients, but it is NOT
     * trusted as the authoritative booking price.
     */
    if (
      estimatedFare !==
        undefined &&
      estimatedFare !== null &&
      estimatedFare !== ""
    ) {
      const clientFare =
        Number(estimatedFare);

      if (
        !Number.isFinite(
          clientFare
        ) ||
        clientFare < 0
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
    }

    const validPricingType =
      Object.values(
        PricingType
      ).includes(
        pricingType as PricingType
      )
        ? (pricingType as PricingType)
        : PricingType.LOCAL;

    const validTripType =
      Object.values(
        TripType
      ).includes(
        tripType as TripType
      )
        ? (tripType as TripType)
        : TripType.ONEWAY;

    const normalizedDistanceKm =
      typeof distanceKm ===
        "number" &&
      Number.isFinite(
        distanceKm
      )
        ? Math.max(
            distanceKm,
            0
          )
        : 0;

    const normalizedDurationHours =
      typeof durationHours ===
        "number" &&
      Number.isFinite(
        durationHours
      )
        ? Math.max(
            durationHours,
            0
          )
        : 0;

    /*
     * ============================================================
     * 3. CUSTOMER VALIDATION
     * ============================================================
     */

    const customer =
      await prisma.customer.findUnique(
        {
          where: {
            userId: user.id,
          },
        }
      );

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
      await prisma.vendor.findFirst(
        {
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
        }
      );

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
      await prisma.vehicle.findFirst(
        {
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
        }
      );

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
     */

    if (
      driverId &&
      vehicle.driverId !==
        driverId
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
     * 7. VEHICLE/VENDOR OWNERSHIP
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
     * 8. SERVER-SIDE PRICING
     * ============================================================
     */

    const pricing =
      await pricingService.calculate(
        {
          pricingPackageId: typeof pricingPackageId === "string" ? pricingPackageId : undefined,
          city: pickupLocation.split(",")[0]?.trim(),
          origin: pickupLocation.split(",")[0]?.trim(),
          destination: dropLocation.split(",")[0]?.trim(),
          vendorId:
            vendor.id,

          vehicleId:
            vehicle.id,

          vehicleCategory:
            vehicle.category,

          pricingType:
            validPricingType,

          tripType:
            validTripType,

          distanceKm:
            normalizedDistanceKm,

          durationHours:
            normalizedDurationHours,

          pickupDateTime:
            pickupDate,

          couponId:
            typeof couponId ===
            "string"
              ? couponId
              : undefined,

          customerId:
            customer.id,
        }
      );

    const bookingDays =
      validTripType === TripType.ROUNDTRIP
        ? tripDaysFromSnapshot(pricing.priceSnapshot, 1)
        : 1;

    const reservationWindow =
      reservationWindowFromPickup(
        pickupDate,
        bookingDays
      );

    let resolvedPricingPackageId =
      typeof pricingPackageId === "string" && pricingPackageId.trim()
        ? pricingPackageId.trim()
        : null;

    if (resolvedPricingPackageId) {
      const selectedPackage = await prisma.pricingPackage.findFirst({
        where: {
          id: resolvedPricingPackageId,
          vehicleId: vehicle.id,
          isActive: true,
          pricingRule: {
            vendorId: vendor.id,
            pricingType: validPricingType,
            tripType: validTripType,
          },
        },
        select: { id: true },
      });

      if (!selectedPackage) {
        return NextResponse.json(
          { success:false, message:"Selected pricing package is not compatible with the booking." },
          {status:409}
        );
      }
    } else {
      const pickupCity = pickupLocation.split(",")[0]?.trim() || "";
      const dropCity = dropLocation.split(",")[0]?.trim() || "";

      const selectedPackage = await prisma.pricingPackage.findFirst({
        where: {
          vehicleId: vehicle.id,
          isActive: true,
          pricingRule: {
            vendorId: vendor.id,
            pricingType: validPricingType,
            tripType: validTripType,
          },
          OR: [
            { fromCity: { equals: pickupCity, mode: "insensitive" }, toCity: { equals: dropCity, mode: "insensitive" } },
            { fromCity: null, toCity: null },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      resolvedPricingPackageId = selectedPackage?.id ?? null;
    }

    /*
     * ============================================================
     * 9. ATOMIC BOOKING CREATION
     * ============================================================
     */

    const booking =
      await prisma.$transaction(
        async (tx) => {
          const currentVehicle =
            await tx.vehicle.findFirst(
              {
                where: {
                  id: vehicle.id,
                  vendorId:
                    vendor.id,
                  deletedAt: null,
                  isVerified: true,
                  status:
                    "AVAILABLE",
                },
                select: {
                  id: true,
                  vendorId: true,
                  driverId: true,
                  status: true,
                },
              }
            );

          if (!currentVehicle) {
            throw new BookingConflictError(
              "Selected vehicle is no longer available."
            );
          }

          if (
            driverId &&
            currentVehicle.driverId !==
              driverId
          ) {
            throw new BookingConflictError(
              "Selected driver is no longer assigned to this vehicle."
            );
          }

          const conflictingBooking =
            await findBookingConflict(
              tx,
              {
                vehicleId: currentVehicle.id,
                driverId: currentVehicle.driverId,
                window: reservationWindow,
              }
            );

          if (conflictingBooking) {
            throw new BookingConflictError(
              conflictingBooking.vehicleConflict
                ? "This vehicle is already booked for one or more selected travel dates."
                : "The assigned driver is already booked for one or more selected travel dates."
            );
          }

          if (!pricing.quoteId) throw new PricingError("QUOTE_REQUIRED");
          await consumeQuote(tx, pricing.quoteId, `customer:${customer.id}`, currentVehicle.id);
          const createdBooking =
            await tx.booking.create(
              {
                data: {
                  bookingNumber:
                    await generateBookingNumber(tx),

                  bookingSource:
                    BookingSource.WEBSITE,

                  customerId:
                    customer.id,

                  vendorId:
                    currentVehicle.vendorId,

                  vehicleId:
                    currentVehicle.id,

                  driverId:
                    currentVehicle.driverId ??
                    null,

                  priceSnapshot: json(pricing.priceSnapshot),
                  pricingQuoteId: pricing.quoteId,
                  pricingPackageId:
                    resolvedPricingPackageId,

                  pickupLocation:
                    pickupLocation.trim(),

                  dropLocation:
                    dropLocation.trim(),

                  pickupDateTime:
                    pickupDate,

                  reservedFrom:
                    reservationWindow.start,

                  reservedUntil:
                    reservationWindow.end,

                  tripDays:
                    bookingDays,

                  tripType:
                    validTripType,

                  estimatedFare:
                    pricing.finalFare,

                  baseFare:
                    pricing.baseFare,

                  taxAmount:
                    pricing.taxAmount,

                  discountAmount:
                    pricing.discountAmount,

                  extraCharges:
                    pricing.extraCharges,

                  finalFare:
                    pricing.finalFare,

                  vendorEarning:
                    pricing.vendorEarning,

                  platformCommission:
                    pricing.platformCommission,

                  driverPayout:
                    pricing.driverPayout,
                },
              }
            );

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
                  "Marketplace booking created with server-side pricing.",
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
     * 10. SUCCESS RESPONSE
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
    if (error instanceof PricingError) return pricingResponse(error);
    if (
      error instanceof
      BookingConflictError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        { status: 409 }
      );
    }

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

class BookingConflictError extends Error {
  constructor(
    message: string
  ) {
    super(message);
    this.name =
      "BookingConflictError";
  }
}


