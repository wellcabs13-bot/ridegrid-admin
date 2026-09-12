import { NextRequest, NextResponse } from "next/server";
import { BookingStatus,
  BookingStatusAction,
  CouponScope,
  CouponStatus,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  UserRole,
  VehicleStatus,
  DriverStatus, BookingSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { passwordService } from "@/lib/auth/password";
import { chargeCorporateCredit } from "@/lib/services/corporate/CorporateCreditService";
import { generateBookingNumber } from "@/lib/services/booking/BookingNumberService";

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

    const packageData = await prisma.pricingPackage.findFirst({
      where: {
        id: pricingPackageId,
        vehicleId: listingId,
        isActive: true,
      },
    });

    if (!packageData) {
      return NextResponse.json(
        { success: false, message: "Selected pricing is no longer active." },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: listingId,
        deletedAt: null,
        status: VehicleStatus.AVAILABLE,
        isVerified: true,
      },
      include: {
        vendor: {
          include: {
            user: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: "Selected vehicle is no longer available." },
        { status: 409 }
      );
    }

    if (
      !vehicle.vendor ||
      vehicle.vendor.deletedAt !== null ||
      !vehicle.vendor.isApproved ||
      !vehicle.vendor.user.isActive ||
      vehicle.vendor.user.deletedAt !== null
    ) {
      return NextResponse.json(
        { success: false, message: "Selected vendor is not currently available." },
        { status: 409 }
      );
    }

    if (
      vehicle.driver &&
      (
        vehicle.driver.deletedAt !== null ||
        vehicle.driver.status !== DriverStatus.ACTIVE ||
        !vehicle.driver.user.isActive ||
        vehicle.driver.user.deletedAt !== null
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Assigned driver is not currently available." },
        { status: 409 }
      );
    }

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        vehicleId: vehicle.id,
        pickupDateTime,
        deletedAt: null,
        status: {
          notIn: [
            BookingStatus.CANCELLED,
            BookingStatus.TRIP_COMPLETED,
          ],
        },
      },
      select: { id: true },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { success: false, message: "This vehicle has already been booked for the selected time." },
        { status: 409 }
      );
    }

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
            message: `Minimum booking amount for ${coupon.code} is ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${Number(coupon.minimumBooking).toLocaleString("en-IN")}.`,
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
        deletedAt: null,
        user: {
          OR: [
            { email },
            { mobile },
          ],
          deletedAt: null,
          isActive: true,
        },
      },
      include: { user: true },
    });

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

    const finalFare = Math.max(0, subtotal - discountAmount);
    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) return NextResponse.json({success:false,message:"Invalid payment method."},{status:400});
    if (paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.CORPORATE_CREDIT) return NextResponse.json({success:false,message:"Selected payment method is not currently available."},{status:400});

    const booking = await prisma.$transaction(async (tx) => {
      const currentVehicle = await tx.vehicle.findFirst({
        where: {
          id: vehicle.id,
          deletedAt: null,
          status: VehicleStatus.AVAILABLE,
          isVerified: true,
        },
      });

      if (!currentVehicle) {
        throw new Error("Vehicle became unavailable. Please search again.");
      }

      const existingBooking = await tx.booking.findFirst({
        where: {
          vehicleId: vehicle.id,
          pickupDateTime,
          deletedAt: null,
          status: {
            notIn: [
              BookingStatus.CANCELLED,
              BookingStatus.TRIP_COMPLETED,
            ],
          },
        },
        select: { id: true },
      });

      if (existingBooking) {
        throw new Error("This vehicle was just booked for the selected time.");
      }

      const created = await tx.booking.create({
        data: {
          bookingNumber: await generateBookingNumber(tx),
          bookingSource: corporateId
            ? BookingSource.CORPORATE
            : BookingSource.WEBSITE,
          customerId: customer.id,
          vendorId: vehicle.vendorId,
          vehicleId: vehicle.id,
          driverId: vehicle.driverId,
          pricingPackageId: packageData.id,
          corporateId: corporateId || null,
          pickupLocation: pickupAddress,
          dropLocation: dropAddress,
          pickupDateTime,
          status: BookingStatus.CONFIRMED,
          estimatedFare: subtotal,
          baseFare: subtotal,
          taxAmount: 0,
          discountAmount,
          couponAmount: discountAmount,
          extraCharges: 0,
          finalFare,
          vendorEarning: finalFare,
          platformCommission: 0,
          driverPayout: 0,
        },
      });

      if (paymentMethod === PaymentMethod.CORPORATE_CREDIT) {
        await chargeCorporateCredit(tx, corporateId, finalFare, created.id);
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: created.id,
          previousStatus: null,
          currentStatus: BookingStatus.CONFIRMED,
          action: BookingStatusAction.CREATED,
          changedBy: null,
          remarks: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? "Marketplace booking confirmed with Corporate Credit Account." : "Marketplace booking confirmed with Cash on Pickup.",
        },
      });

      await tx.transaction.create({
        data: {
          bookingId: created.id,
          vendorId: vehicle.vendorId,
          transactionType: TransactionType.BOOKING_PAYMENT,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? PaymentStatus.PAID : PaymentStatus.PENDING,
          amount: finalFare,
          currency: "INR",
          referenceNumber: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? `CORP-${created.bookingNumber}` : `CASH-${created.bookingNumber}`,
          gatewayName: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? "CORPORATE_CREDIT" : "CASH",
          processedAt: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? new Date() : null,
          remarks: paymentMethod === PaymentMethod.CORPORATE_CREDIT ? "Corporate Credit Account" : "Cash on Pickup",
        },
      });

      if (coupon) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            bookingId: created.id,
            customerId: customer.id,
            discountAmount,
          },
        });

        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

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



