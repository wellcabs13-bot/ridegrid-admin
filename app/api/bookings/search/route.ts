import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      bookingType,
      pickupCity,
      dropCity,
      pickupDate,
      vehicleCategory,
    } = body;

    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: "AVAILABLE",
        homeCity: pickupCity,

        ...(vehicleCategory && {
          category: vehicleCategory,
        }),
      },

      include: {
        vendor: true,
        driver: true,
      },

      orderBy: [
        {
          rating: "desc",
        },
      ],
    });

    const result = vehicles.map((vehicle) => ({
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,

      brand: vehicle.brand,
      model: vehicle.model,
      category: vehicle.category,

      rating: vehicle.rating,

      baseFare: vehicle.baseFare,

      vendor: {
        id: vehicle.vendor.id,
        businessName: vehicle.vendor.businessName,
        rating: vehicle.vendor.rating,
      },

      driver: {
        id: vehicle.driver?.id,
        name: vehicle.driver?.fullName,
        rating: vehicle.driver?.rating,
      },

      pickupCity,
      dropCity,
      pickupDate,
      bookingType,
    }));

    return NextResponse.json({
      success: true,
      total: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to search vehicles.",
      },
      { status: 500 }
    );
  }
}