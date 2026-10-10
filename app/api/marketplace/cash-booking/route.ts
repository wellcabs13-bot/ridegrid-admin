import { assertQuoteUsable, Snapshot } from "@/lib/services/pricing/QuoteService";
import { PricingError, decimal } from "@/lib/services/pricing/engine";
import { pricingResponse } from "@/lib/services/pricing/access";
import { normalizeMobile } from "@/lib/auth/identity";
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
import { signCheckoutToken } from "@/lib/payments/checkoutToken";
import { TripType } from "@prisma/client";
import { requestUser } from "@/lib/request-access";
import { payuReady } from "@/lib/payments/payu";
import { EmployeeAccess, employeeSelect, failure as employeeFailure } from "@/lib/corporate-employee-mobile/access";
import { writeEmployee } from "@/lib/corporate-employee-mobile/write";
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

// Corporate bookings from the web marketplace use the exact Corporate Employee
// pipeline: quote -> travel policy -> approval (if required) -> Corporate Credit.
// An approval request is returned as such; it is never a confirmed booking.
async function corporateBooking(request: NextRequest, body: Record<string, unknown>, actor: Awaited<ReturnType<typeof requestUser>>) {
  if (!actor) return NextResponse.json({ success: false, message: "Sign in to use a corporate account." }, { status: 401 });
  if (!["CORPORATE_ADMIN", "CORPORATE_EMPLOYEE"].includes(actor.role))
    return NextResponse.json({ success: false, message: "Corporate bookings are made by the company's travellers from the Corporate Portal or Corporate Employee App so travel policy and approvals apply." }, { status: 403 });
  const corporateId = text(body.corporateId);
  const employee = await prisma.corporateEmployee.findFirst({ where: { userId: actor.id, corporateId, isActive: true }, select: employeeSelect });
  if (!employee?.userId) return NextResponse.json({ success: false, message: "This corporate account is not available to you." }, { status: 403 });
  if (employee.corporate.deletedAt || employee.corporate.status !== "ACTIVE") return NextResponse.json({ success: false, message: "Selected corporate account is not active." }, { status: 409 });
  const access: EmployeeAccess = { user: { id: actor.id, name: actor.name }, employee: employee as EmployeeAccess["employee"] };
  const payload = {
    quoteId: text(body.quoteId), listingId: text(body.listingId), pricingPackageId: text(body.pricingPackageId),
    pickupDateTime: text(body.pickupDateTime), pickupAddress: text(body.pickupAddress), dropAddress: text(body.dropAddress),
    approvalId: text(body.approvalId), note: text(body.note),
  };
  try {
    if (body.requestApproval === true) {
      const approval = await writeEmployee("approvals", payload, access);
      return NextResponse.json({ success: true, data: { approvalRequested: true, approval } });
    }
    const booking = await writeEmployee("book", payload, access) as { id: string; bookingNumber: string; status: string };
    return NextResponse.json({ success: true, data: { ...booking, paymentMethod: PaymentMethod.CORPORATE_CREDIT, paymentStatus: PaymentStatus.PAID } });
  } catch (error) {
    return employeeFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await requestUser(request);
    if (text(body?.corporateId) || text(body?.paymentMethod) === PaymentMethod.CORPORATE_CREDIT) {
      if (!text(body?.corporateId)) return NextResponse.json({ success: false, message: "Corporate account is required for Corporate Credit." }, { status: 400 });
      return corporateBooking(request, body, actor);
    }
    // Retail: PayU online payment only. Cash and every other method are refused,
    // and nothing is reserved when PayU is not configured.
    const requestedMethod = text(body?.paymentMethod);
    if (requestedMethod && !["PAYU", "ONLINE", PaymentMethod.UPI].includes(requestedMethod))
      return NextResponse.json({ success: false, message: "Retail bookings are paid online with PayU." }, { status: 400 });
    if (!payuReady())
      return NextResponse.json({ success: false, code: "ONLINE_PAYMENT_UNAVAILABLE", message: "Online payment is temporarily unavailable. Please try again shortly." }, { status: 503 });
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
    // PayU confirms the actual instrument after checkout (payuReconcile.ts).
    const paymentMethod: PaymentMethod = PaymentMethod.UPI;

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
      // The same email may belong to other roles (e.g. a vendor); only a CUSTOMER account is reused.
      const existingUser = await prisma.user.findFirst({
        where: { email, role: UserRole.CUSTOMER, deletedAt: null },
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
        }
        // A guest checkout never rewrites the profile of an existing account.
      } else {
        const temporaryPassword = await passwordService.hash(
          passwordService.generateTemporaryPassword()
        );

        const createdUser = await prisma.user.create({
          data: {
            name: `${firstName} ${lastName}`.trim(),
            email,
            mobile: normalizeMobile(mobile),
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
    } else if (actor?.role === "CUSTOMER") {
      // Only the signed-in owner may update their own profile during checkout.
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
    const platform = text(body?.platform) === "mobile" ? "mobile" : "web";

    const usedCoupon = coupon;
    const booking = await commitMarketplaceBooking({
      quoteId,
      ownerId,
      snapshot,
      vehicle,
      pricingPackageId: packageData.id,
      customerId: customer.id,
      corporateId: null,
      bookingSource: platform === "mobile" ? BookingSource.APP : BookingSource.WEBSITE,
      tripType: tripType as TripType,
      pickupAddress,
      dropAddress,
      pickupDateTime,
      window: reservationWindow,
      discountAmount,
      finalFare,
      paymentMethod,
      changedBy: actor?.id ?? null,
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
    // The booking is an AWAITING_PAYMENT hold. Vendor/driver learn about it and
    // BOOKING_CREATED fires only once PayU verifies payment (payuReconcile.ts).
    const txnid = `PAYU-${booking.bookingNumber}`;
    const token = signCheckoutToken(booking.id, txnid);
    const payuCheckoutUrl = `/api/payments/payu/checkout?bookingId=${encodeURIComponent(booking.id)}&token=${encodeURIComponent(token)}&platform=${platform}`;

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        finalFare,
        discountAmount,
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        payuCheckoutUrl,
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
    console.error("MARKETPLACE BOOKING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create booking.",
      },
      { status: 500 }
    );
  }
}
