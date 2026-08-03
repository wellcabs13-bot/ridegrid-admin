import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const driverId = req.nextUrl.searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        {
          success: false,
          message: "Driver ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: {
        id: driverId,
      },
      include: {
        user: true,
        vehicles: true,
        documents: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load profile.",
      },
      {
        status: 500,
      }
    );
  }
}