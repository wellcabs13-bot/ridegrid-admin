import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      tripId,
      driverId,
      vehicleId,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      source,
    } = await req.json();

    const location = await prisma.tripLocation.create({
      data: {
        trip: {
          connect: {
            id: tripId,
          },
        },

        driver: driverId
          ? {
              connect: {
                id: driverId,
              },
            }
          : undefined,

        vehicle: vehicleId
          ? {
              connect: {
                id: vehicleId,
              },
            }
          : undefined,

        latitude,

        longitude,

        speed: speed ?? null,
        heading: heading ?? null,
        accuracy: accuracy ?? null,

        source,

        recordedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Location update failed.",
      },
      {
        status: 500,
      }
    );
  }
}