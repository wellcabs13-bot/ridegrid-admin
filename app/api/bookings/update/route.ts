import { notifyAssignedDriver } from "@/lib/services/booking/DriverNotification";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function optionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("Invalid text value.");
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function PUT(req: NextRequest) {
  try {
    const access = await requestPermission(req, Permission.BOOKING_UPDATE);
    if (access.denied) return access.denied;
    const body = (await req.json()) as Record<string, unknown>;
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
        vendor: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
        vehicle: true,
        driver: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const data: {
      customerId?: string;
      vendorId?: string;
      vehicleId?: string;
      driverId?: string | null;
      pickupLocation?: string;
      dropLocation?: string;
      pickupDateTime?: Date;
      estimatedFare?: number;
      baseFare?: number;
      finalFare?: number;
      pricingPackageId?: string;
      tripType?: "ONEWAY" | "ROUNDTRIP";
      status?: "PENDING" | "CONFIRMED" | "DRIVER_ASSIGNED" | "TRIP_STARTED" | "TRIP_COMPLETED" | "CANCELLED";
    } = {};

    if (hasOwn(body, "customerId")) {
      if (typeof body.customerId !== "string" || !body.customerId.trim()) {
        return NextResponse.json(
          { success: false, message: "A valid customer is required." },
          { status: 400 }
        );
      }
      data.customerId = body.customerId.trim();
    }

    if (hasOwn(body, "vendorId")) {
      if (typeof body.vendorId !== "string" || !body.vendorId.trim()) {
        return NextResponse.json(
          { success: false, message: "A valid vendor is required." },
          { status: 400 }
        );
      }
      data.vendorId = body.vendorId.trim();
    }

    if (hasOwn(body, "vehicleId")) {
      if (typeof body.vehicleId !== "string" || !body.vehicleId.trim()) {
        return NextResponse.json(
          { success: false, message: "A valid vehicle is required." },
          { status: 400 }
        );
      }
      data.vehicleId = body.vehicleId.trim();
    }

    if (hasOwn(body, "driverId")) {
      if (body.driverId === null || body.driverId === "") {
        data.driverId = null;
      } else if (typeof body.driverId === "string") {
        data.driverId = body.driverId.trim();
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid driver." },
          { status: 400 }
        );
      }
    }

    if (hasOwn(body, "pickupLocation")) {
      const value = optionalString(body.pickupLocation);
      if (!value) {
        return NextResponse.json(
          { success: false, message: "Pickup location is required." },
          { status: 400 }
        );
      }
      data.pickupLocation = value;
    }

    if (hasOwn(body, "dropLocation")) {
      const value = optionalString(body.dropLocation);
      if (!value) {
        return NextResponse.json(
          { success: false, message: "Drop location is required." },
          { status: 400 }
        );
      }
      data.dropLocation = value;
    }

    if (hasOwn(body, "pickupDateTime")) {
      if (typeof body.pickupDateTime !== "string") {
        return NextResponse.json(
          { success: false, message: "A valid pickup date and time is required." },
          { status: 400 }
        );
      }

      const date = new Date(body.pickupDateTime);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid pickup date and time." },
          { status: 400 }
        );
      }

      data.pickupDateTime = date;
    }

    if (hasOwn(body, "tripType")) {
      if (body.tripType !== "ONEWAY" && body.tripType !== "ROUNDTRIP") {
        return NextResponse.json({ success:false, message:"Invalid trip type." }, {status:400});
      }
      data.tripType = body.tripType;
    }

    if (hasOwn(body, "status")) {
      const allowed = ["PENDING","CONFIRMED","DRIVER_ASSIGNED","TRIP_STARTED","TRIP_COMPLETED","CANCELLED"];
      if (typeof body.status !== "string" || !allowed.includes(body.status)) {
        return NextResponse.json({success:false,message:"Invalid booking status."},{status:400});
      }
      data.status = body.status as typeof data.status;
    }

    if (hasOwn(body, "estimatedFare")) {
      const fare = Number(body.estimatedFare);
      if (!Number.isFinite(fare) || fare < 0) {
        return NextResponse.json(
          { success: false, message: "Estimated fare must be a valid non-negative number." },
          { status: 400 }
        );
      }
      data.estimatedFare = fare;
    }

    if (existing.priceSnapshot) {
      const fields = ["vendorId","vehicleId","pricingPackageId","tripType","pickupLocation","dropLocation"] as const;
      if (fields.some(key => hasOwn(body,key) && body[key] !== existing[key]) || (data.pickupDateTime && data.pickupDateTime.getTime() !== existing.pickupDateTime.getTime())) {
        return NextResponse.json({success:false,message:"This booking has an immutable price quote. A different trip requires a new quote and booking."},{status:409});
      }
    }
    const customerId = data.customerId ?? existing.customerId;
    const vendorId = data.vendorId ?? existing.vendorId;
    const vehicleId = data.vehicleId ?? existing.vehicleId;
    const driverId = data.driverId !== undefined ? data.driverId : existing.driverId;
    const pickupDateTime = data.pickupDateTime ?? existing.pickupDateTime;
    const tripType = data.tripType ?? existing.tripType;
    const requestedStatus = data.status ?? existing.status;

    const [customer, vendor, vehicle] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
      prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { vendor: true },
      }),
    ]);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Selected customer was not found." },
        { status: 400 }
      );
    }

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Selected vendor was not found." },
        { status: 400 }
      );
    }

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: "Selected vehicle was not found." },
        { status: 400 }
      );
    }

    if (vehicle.vendorId !== vendorId) {
      return NextResponse.json(
        { success: false, message: "Selected vehicle does not belong to the selected vendor." },
        { status: 400 }
      );
    }

    const vendorRecord = vendor as typeof vendor & { isApproved?: boolean; status?: string };
    const vehicleRecord = vehicle as typeof vehicle & {
      isVerified?: boolean;
      isAvailable?: boolean;
      status?: string;
    };

    if (
      vendorRecord.isApproved === false ||
      vendorRecord.status === "INACTIVE" ||
      vendorRecord.status === "SUSPENDED"
    ) {
      return NextResponse.json(
        { success: false, message: "Selected vendor is not eligible for booking." },
        { status: 400 }
      );
    }

    if (vehicleRecord.isVerified === false) {
      return NextResponse.json(
        { success: false, message: "Selected vehicle is not verified." },
        { status: 400 }
      );
    }

    if (vehicleRecord.isAvailable === false) {
      return NextResponse.json(
        { success: false, message: "Selected vehicle is not available." },
        { status: 400 }
      );
    }

    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return NextResponse.json(
          { success: false, message: "Selected driver was not found." },
          { status: 400 }
        );
      }

      const driverRecord = driver as typeof driver & { status?: string };

      const driverVehicle = await prisma.vehicle.findFirst({
        where: {
          id: vehicleId,
          vendorId,
          driverId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!driverVehicle) {
        return NextResponse.json(
          { success: false, message: "Selected driver is not assigned to the selected vehicle." },
          { status: 400 }
        );
      }

      if (driverRecord.status && !["ACTIVE"].includes(driverRecord.status)) {
        return NextResponse.json(
          { success: false, message: "Selected driver is not active." },
          { status: 400 }
        );
      }
    }

    let packagePricing:
      | {
          baseFare: number;
          driverAllowance: number | null;
          nightCharge: number | null;
          tollCharge: number | null;
          parkingCharge: number | null;
          otherCharges: number | null;
          extraPickupCharge: number | null;
          extraDropCharge: number | null;
        }
      | undefined;

    if (hasOwn(body, "pricingPackageId")) {
      if (typeof body.pricingPackageId !== "string" || !body.pricingPackageId.trim()) {
        return NextResponse.json(
          { success: false, message: "An active Pricing Package is required." },
          { status: 400 }
        );
      }

      const pricingPackage = await prisma.pricingPackage.findFirst({
        where: {
          id: body.pricingPackageId.trim(),
          isActive: true,
          vehicleId,
          vehicle: { vendorId, deletedAt: null },
        },
      });

      if (!pricingPackage) {
        return NextResponse.json(
          { success: false, message: "Selected Pricing Package is not valid for the selected vendor and vehicle." },
          { status: 409 }
        );
      }

      packagePricing = {
        baseFare: Number(pricingPackage.baseFare),
        driverAllowance: pricingPackage.driverAllowance == null ? null : Number(pricingPackage.driverAllowance),
        nightCharge: pricingPackage.nightCharge == null ? null : Number(pricingPackage.nightCharge),
        tollCharge: pricingPackage.tollCharge == null ? null : Number(pricingPackage.tollCharge),
        parkingCharge: pricingPackage.parkingCharge == null ? null : Number(pricingPackage.parkingCharge),
        otherCharges: pricingPackage.otherCharges == null ? null : Number(pricingPackage.otherCharges),
        extraPickupCharge: pricingPackage.extraPickupCharge == null ? null : Number(pricingPackage.extraPickupCharge),
        extraDropCharge: pricingPackage.extraDropCharge == null ? null : Number(pricingPackage.extraDropCharge),
      };
    }

    if (packagePricing) {
      data.estimatedFare =
        packagePricing.baseFare +
        (packagePricing.driverAllowance || 0) +
        (packagePricing.nightCharge || 0) +
        (packagePricing.tollCharge || 0) +
        (packagePricing.parkingCharge || 0) +
        (packagePricing.otherCharges || 0) +
        (packagePricing.extraPickupCharge || 0) +
        (packagePricing.extraDropCharge || 0);
    }

    const pricingPackageId =
      typeof body.pricingPackageId === "string" ? body.pricingPackageId.trim() : "";

    if (!pricingPackageId) {
      return NextResponse.json(
        { success:false, message:"An active Pricing Package is required." },
        {status:400}
      );
    }

    const pricingPackage = await prisma.pricingPackage.findFirst({
      where:{
        id:pricingPackageId,
        isActive:true,
        vehicleId,
        pricingRule:{ tripType },
        vehicle:{ vendorId, deletedAt:null }
      },
      include:{ pricingRule:true }
    });

    if (!pricingPackage) {
      return NextResponse.json(
        {success:false,message:"Selected Pricing Package is not compatible with the selected vendor, vehicle and trip type."},
        {status:409}
      );
    }

    data.pricingPackageId = pricingPackage.id;

    const activeConflictingBooking = await prisma.booking.findFirst({
      where:{
        id:{not:bookingId},
        vehicleId,
        pickupDateTime,
        deletedAt:null,
        status:{notIn:["CANCELLED","TRIP_COMPLETED"]}
      },
      select:{id:true,bookingNumber:true}
    });

    if (activeConflictingBooking) {
      return NextResponse.json(
        {success:false,message:`Vehicle is already booked at this pickup time (${activeConflictingBooking.bookingNumber}).`},
        {status:409}
      );
    }

    const packageBaseFare = Number(pricingPackage.baseFare);
    const existingDiscount = Number(existing.discountAmount || 0);
    const recalculatedFinalFare = Math.max(0, packageBaseFare - existingDiscount);

    data.estimatedFare = packageBaseFare;
    data.baseFare = packageBaseFare;
    data.finalFare = recalculatedFinalFare;

    if (existing.priceSnapshot) {
      // Pricing integration contract: never recalculate accepted quotes from mutable packages.
      data.estimatedFare = Number(existing.estimatedFare);
      data.baseFare = Number(existing.baseFare);
      data.finalFare = Number(existing.finalFare);
      packagePricing = undefined;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: packagePricing
          ? { ...data, baseFare: packagePricing.baseFare, finalFare: data.estimatedFare }
          : data,
        include: {
          customer: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
          vendor: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
          vehicle: true,
          driver: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
          pricingPackage: { include: { pricingRule: true, vehicle: true } },
          transactions: { orderBy: { createdAt: "desc" } },
          couponUsages: { include: { coupon: true } },
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
      });

      const assignmentChanged =
        existing.vendorId !== booking.vendorId ||
        existing.vehicleId !== booking.vehicleId ||
        existing.driverId !== booking.driverId;

      const statusChanged = existing.status !== booking.status;

      if (assignmentChanged || statusChanged) {
        let action: "ASSIGNED" | "REASSIGNED" | "STATUS_CHANGED" | "CANCELLED" | "COMPLETED" = "STATUS_CHANGED";
        if (booking.status === "CANCELLED") action = "CANCELLED";
        else if (booking.status === "TRIP_COMPLETED") action = "COMPLETED";
        else if (assignmentChanged && existing.driverId) action = "REASSIGNED";
        else if (assignmentChanged) action = "ASSIGNED";

        await tx.bookingStatusHistory.create({
          data:{
            bookingId:booking.id,
            previousStatus:existing.status,
            currentStatus:booking.status,
            action,
            changedBy:access.user!.id,
            remarks:"Booking updated from Super Admin Booking Management.",
          }
        });
      }

      await notifyAssignedDriver(tx, booking.id, "Booking updated");
      return booking;
    });

    return NextResponse.json({
      success: true,
      message: "Booking updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/bookings/update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Booking update failed.",
      },
      { status: 500 }
    );
  }
}
