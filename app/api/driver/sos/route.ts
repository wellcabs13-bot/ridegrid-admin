import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      driverId,
      vehicleId,
      tripId,
      latitude,
      longitude,
      remarks,
      status,
    } = body;

    const sos = await prisma.sOSEvent.create({
      data: {
        driverId: driverId || null,
        vehicleId: vehicleId || null,
        tripId: tripId || null,

        latitude: latitude || null,
        longitude: longitude || null,

        remarks: remarks || null,

        status: status || "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      data: sos,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "SOS request failed.",
      },
      {
        status: 500,
      }
    );
  }
}