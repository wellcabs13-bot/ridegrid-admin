import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const driverId = req.nextUrl.searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { success: false, message: "Driver ID is required." },
        { status: 400 }
      );
    }

    const trips = await prisma.trip.findMany({
      where: {
        driverId,
      },
      include: {
        booking: true,
        vehicle: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch trips.",
      },
      {
        status: 500,
      }
    );
  }
}