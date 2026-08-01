import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customerId,
      vendorId,
      vehicleId,
      driverId,
      bookingType,
      pickupCity,
      dropCity,
      pickupAddress,
      dropAddress,
      pickupDate,
      passengers,
      totalAmount,
      advanceAmount,
    } = body;

    if (
      !customerId ||
      !vendorId ||
      !vehicleId ||
      !driverId ||
      !pickupCity ||
      !dropCity ||
      !pickupAddress ||
      !dropAddress ||
      !pickupDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields.",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `RG${Date.now()}`,
        customerId,
        vendorId,
        vehicleId,
        driverId,

        bookingType,

        pickupCity,
        dropCity,

        pickupAddress,
        dropAddress,

        pickupDate: new Date(pickupDate),

        passengers: passengers ?? 1,

        totalAmount,

        advanceAmount: advanceAmount ?? 0,

        dueAmount: totalAmount - (advanceAmount ?? 0),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking created successfully.",
      booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create booking.",
      },
      { status: 500 }
    );
  }
}