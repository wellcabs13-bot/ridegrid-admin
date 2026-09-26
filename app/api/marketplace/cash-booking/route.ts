import { assertQuoteUsable, Snapshot } from "@/lib/services/pricing/QuoteService";
import { PricingError, decimal } from "@/lib/services/pricing/engine";
import { pricingResponse } from "@/lib/services/pricing/access";
import { NextRequest, NextResponse } from "next/server";
import {
  CouponScope,
  CouponStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  BookingSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { passwordService } from "@/lib/auth/password";
import {
  BookingConflictError,
  MarketplaceBookingError,
  commitMarketplaceBooking,
  loadBookableListing,
} from "@/lib/services/booking/MarketplaceBookingService";
import { TripType } from "@prisma/client";
import { requestUser } from "@/lib/request-access";
import { createRideGridEvent } from "@/lib/events/event-bus";
import { dispatchRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";
import {
  reservationWindowFromPickup,
  tripDaysFromSnapshot,
} from "@/lib/services/marketplace/BookingAvailabilityService";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function calculateDiscount(
  coupon: {
    couponType: "PERCENTAGE" | "FLAT";
    discountValue: unknown;
    maximumDiscount: unknown;
  },
  subtotal: number
) {
  let discount =
    coupon.couponType === "PERCENTAGE"
      ? (subtotal * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);

  if (coupon.maximumDiscount != null) {
    discount = Math.min(
      discount,
      Number(coupon.maximumDiscount)
    );
  }

  return Math.max(0, Math.min(discount, subtotal));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await requestUser(request);
    const ownerId = actor?.id || `guest:${request.cookies.get("ridegrid_quote_session")?.value || "missing"}`;
    const quoteId = text(body.quoteId);
    const quoteRecord = quoteId ? await prisma.pricingQuote.findUnique({where:{id:quoteId},include:{booking:{select:{id:true,bookingNumber:true,status:true,finalFare:true}}}}) : null;
    if (!quoteRecord) throw new PricingError("QUOTE_REQUIRED", "Refresh the listing to obtain a booking quote.");
    assertQuoteUsable(quoteRecord, ownerId, text(body.listingId));
    if (quoteRecord.booking) return NextResponse.json({success:true,data:quoteRecord.booking});
    const snapshot = quoteRecord.snapshot as unknown as Snapshot;
    if (snapshot.pricingPackageId !== text(body.pricingPackageId) || snapshot.tripDateTime !== new Date(text(body.pickupDateTime)).toISOString()) throw new PricingError("QUOTE_MISMATCH", "Trip details changed. Request a new quote.");
    if (body.couponId) throw new PricingError("COUPON_FUNDING_REQUIRED", "Only quoted funding-aware discounts are supported.");

    const listingId = text(body?.listingId);
    const pricingPackageId = text(body?.pricingPackageId);
    const serviceType = text(body?.serviceType);
    const tripType = text(body?.tripType) || "ONEWAY";
    const pickupAddress = text(body?.pickupAddress);
    const dropAddress = text(body?.dropAddress);
    const pickupCity = text(body?.pickupCity);
    const pickupDateTimeValue = text(body?.pickupDateTime);
    const couponId = text(body?.couponId);
    const paymentMethod = text(body?.paymentMethod) || PaymentMethod.CASH;
    const corporateId = text(body?.corporateId);

    if (paymentMethod === PaymentMethod.CORPORATE_CREDIT && !corporateId) {
      return NextResponse.json(
        { success: false, message: "Corporate account is required for Corporate Credit." },
        { status: 400 }
      );
    }

    if (corporateId) {
      const actor = await requestUser(request);
      if (!actor) return NextResponse.json({ success: false, message: "Sign in to use a corporate account." }, { status: 401 });
      if (!["SUPER_ADMIN", "OPERATIONS"].includes(actor.role)) {
        const membership = await prisma.corporateEmployee.findFirst({ where: { userId: actor.id, corporateId, isActive: true }, select: { id: true } });
        if (!membership || !["CORPORATE_ADMIN", "CORPORATE_EMPLOYEE"].includes(actor.role)) return NextResponse.json({ success: false, message: "This corporate account is not available to you." }, { status: 403 });
      }
      const corporate = await prisma.corporate.findFirst({
        where: { id: corporateId, deletedAt: null, status: "ACTIVE" },
        select: { id: true },
      });

      if (!corporate) {
        return NextResponse.json(
          { success: false, message: "Selected corporate account is not active." },
          { status: 409 }
        );
      }
    }

    const firstName = text(body?.customer?.firstName);
    const lastName = text(body?.customer?.lastName);
    const mobile = text(body?.customer?.mobile);
    const email = text(body?.customer?.email).toLowerCase();

    if (!listingId || !pricingPackageId) {
      return NextResponse.json(
        { success: false, message: "Vehicle and pricing package are required." },
        { status: 400 }
      );
    }

    if (!firstName || !lastName || !mobile || !email) {
      return NextResponse.json(
        { success: false, message: "Complete customer details are required." },
        { status: 400 }
      );
    }

    if (!pickupAddress || !dropAddress) {
      return NextResponse.json(
        { success: false, message: "Pickup and drop locations are required." },
        { status: 400 }
      );
    }

    const pickupDateTime = new Date(pickupDateTimeValue);

    if (
      !pickupDateTimeValue ||
      Number.isNaN(pickupDateTime.getTime()) ||
      pickupDateTime.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { success: false, message: "Pickup date and time must be in the future." },
        { status: 400 }
      );
    }

    const bookingDays =
      tripType === TripType.ROUNDTRIP
        ? tripDaysFromSnapshot(snapshot, 1)
        : 1;

    const reservationWindow =
      reservationWindowFromPickup(
        pickupDateTime,
        bookingDays
      );

    const { packageData, vehicle } = await loadBookableListing(listingId, pricingPackageId, reservationWindow);

    const subtotal = Number(packageData.baseFare);
    let discountAmount = 0;
    let coupon: {
      id: string;
      code: string;
      couponType: "PERCENTAGE" | "FLAT";
      discountValue: unknown;
      maximumDiscount: unknown;
      minimumBooking: unknown;
      usageLimit: number | null;
      usedCount: number;
      validFrom: Date;
      validTo: Date;
      isFirstRideOnly: boolean;
      couponScope: CouponScope;
    } | null = null;

    if (couponId) {
      coupon = await prisma.coupon.findFirst({
        where: {
          id: couponId,
          status: CouponStatus.ACTIVE,
        },
      });

      if (!coupon) {
        return NextResponse.json(
          { success: false, message: "Selected coupon is no longer active." },
          { status: 409 }
        );
      }

      const now = new Date();

      if (now < coupon.validFrom || now > coupon.validTo) {
        return NextResponse.json(
          { success: false, message: "Selected coupon has expired or is not yet valid." },
          { status: 409 }
        );
      }

      if (
        coupon.usageLimit != null &&
        coupon.usedCount >= coupon.usageLimit
      ) {
        return NextResponse.json(
          { success: false, message: "Selected coupon usage limit has been reached." },
          { status: 409 }
        );
      }

      if (
        coupon.minimumBooking != null &&
        subtotal < Number(coupon.minimumBooking)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum booking amount for ${coupon.code} is ₹${Number(coupon.minimumBooking).toLocaleString("en-IN")}.`,
          },
          { status: 409 }
        );
      }

      if (coupon.couponScope === CouponScope.VENDOR) {
        const vendorOffer = await prisma.vendorPromotion.findFirst({
          where: {
            vendorId: vehicle.vendorId,
            couponId: coupon.id,
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        });

        if (!vendorOffer) {
          return NextResponse.json(
            { success: false, message: "This coupon is not valid for the selected vendor." },
            { status: 409 }
          );
        }
      }

      if (coupon.couponScope === CouponScope.CITY) {
        const cityOffer = await prisma.geoPromotion.findFirst({
          where: {
            couponId: coupon.id,
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
            OR: [
              { city: pickupCity || packageData.city || "" },
              { city: null },
            ],
          },
        });

        if (!cityOffer) {
          return NextResponse.json(
            { success: false, message: "This coupon is not valid for the selected pickup city." },
            { status: 409 }
          );
        }
      }
    }

    let customer = await prisma.customer.findFirst({
      where: {
        ...(actor?.role === "CUSTOMER" ? { userId: actor.id } : {}),
        deletedAt: null,
        user: {
          ...(actor?.role === "CUSTOMER" ? {} : { OR: [
            { email },
            { mobile },
          ] }),
          deletedAt: null,
          isActive: true,
        },
      },
      include: { user: true },
    });

    if (actor?.role === "CUSTOMER" && !customer) {
      return NextResponse.json({ success: false, message: "Your customer profile is unavailable. Please contact support." }, { status: 409 });
    }

    if (!customer) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        if (existingUser.deletedAt || !existingUser.isActive) {
          return NextResponse.json(
            {
              success: false,
              message: "The customer account associated with this email is inactive.",
            },
            { status: 409 }
          );
        }

        if (existingUser.role !== UserRole.CUSTOMER) {
          return NextResponse.json(
            {
              success: false,
              message: "This email is already registered to another RideGrid account.",
            },
            { status: 409 }
          );
        }

        customer = await prisma.customer.findUnique({
          where: { userId: existingUser.id },
          include: { user: true },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              userId: existingUser.id,
              firstName,
              lastName,
            },
            include: { user: true },
          });
        } else {
          await prisma.user.update({
            where: { id: customer.userId },
            data: {
              name: `${firstName} ${lastName}`.trim(),
              mobile: customer.user.mobile || mobile,
            },
          });

          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              firstName,
              lastName,
            },
          });

          customer = await prisma.customer.findUnique({
            where: { id: customer.id },
            include: { user: true },
          });
        }
      } else {
        const temporaryPassword = await passwordService.hash(
          passwordService.generateTemporaryPassword()
        );

        const createdUser = await prisma.user.create({
          data: {
            name: `${firstName} ${lastName}`.trim(),
            email,
            mobile,
            password: temporaryPassword,
            role: UserRole.CUSTOMER,
            isActive: true,
            isVerified: false,
          },
        });

        customer = await prisma.customer.create({
          data: {
            userId: createdUser.id,
            firstName,
            lastName,
          },
          include: { user: true },
        });
      }
    } else {
      await prisma.user.update({
        where: { id: customer.userId },
        data: {
          name: `${firstName} ${lastName}`.trim(),
          mobile: customer.user.mobile || mobile,
        },
      });

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName,
          lastName,
        },
      });

      customer = await prisma.customer.findUnique({
        where: { id: customer.id },
        include: { user: true },
      });
    }

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to resolve the customer account.",
        },
        { status: 409 }
      );
    }

    if (coupon?.isFirstRideOnly) {
      const previousBooking = await prisma.booking.findFirst({
        where: {
          customerId: customer.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (previousBooking) {
        return NextResponse.json(
          { success: false, message: "This coupon is available only for the first ride." },
          { status: 409 }
        );
      }
    }

    if (coupon) {
      discountAmount = calculateDiscount(coupon, subtotal);
    }

    discountAmount = decimal(snapshot.vendorFundedDiscount).plus(snapshot.rideGridFundedDiscount).toNumber();
    const finalFare = Number(snapshot.finalPayable);
    if (!Object.values(TripType).includes(tripType as TripType)) return NextResponse.json({ success: false, message: "Invalid trip type." }, { status: 400 });
    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) return NextResponse.json({success:false,message:"Invalid payment method."},{status:400});
    if (paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.CORPORATE_CREDIT) return NextResponse.json({success:false,message:"Selected payment method is not currently available."},{status:400});

    const usedCoupon = coupon;
    const booking = await commitMarketplaceBooking({
      quoteId,
      ownerId,
      snapshot,
      vehicle,
      pricingPackageId: packageData.id,
      customerId: customer.id,
      corporateId: corporateId || null,
      bookingSource: corporateId ? BookingSource.CORPORATE : BookingSource.WEBSITE,
      tripType: tripType as TripType,
      pickupAddress,
      dropAddress,
      pickupDateTime,
      window: reservationWindow,
      discountAmount,
      finalFare,
      paymentMethod: paymentMethod as PaymentMethod,
      afterCreate: usedCoupon
        ? async (tx, created) => {
            await tx.couponUsage.create({
              data: {
                couponId: usedCoupon.id,
                bookingId: created.id,
                customerId: customer.id,
                discountAmount,
              },
            });

            await tx.coupon.update({
              where: { id: usedCoupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        : undefined,
    });
    // Booking is already committed. A delivery failure must not invite duplicate booking retries.
    try {
      await dispatchRideGridEvent(createRideGridEvent({
        type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING",
        bookingId: booking.id, userId: customer.userId, customerId: customer.id,
        vendorId: vehicle.vendorId, driverId: vehicle.driverId ?? undefined,
        metadata: { bookingNumber: booking.bookingNumber, source: booking.bookingSource, paymentMethod },
      }));
    } catch {
      console.error("Marketplace booking saved; booking notification dispatch requires retry.");
    }
    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        finalFare,
        discountAmount,
        paymentMethod: paymentMethod as PaymentMethod,
        paymentStatus: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? PaymentStatus.PAID : PaymentStatus.PENDING,
      },
    });
  } catch (error) {
    if (error instanceof PricingError) return pricingResponse(error);
    if (error instanceof MarketplaceBookingError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }
    console.error("MARKETPLACE CASH BOOKING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create cash booking.",
      },
      { status: 500 }
    );
  }
}
