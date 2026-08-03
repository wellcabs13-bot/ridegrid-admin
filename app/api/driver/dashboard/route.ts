import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalDrivers = await prisma.driver.count({
      where: {
        deletedAt: null,
      },
    });

    const availableDrivers = await prisma.driver.count({
      where: {
        deletedAt: null,
        bookings: {
          none: {
            status: {
              in: ["TRIP_STARTED"],
            },
          },
        },
      },
    });

    const runningTrips = await prisma.trip.count({
      where: {
        status: "STARTED",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalDrivers,
        availableDrivers,
        runningTrips,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}