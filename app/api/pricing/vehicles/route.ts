import { pricingAccess, pricingResponse } from "@/lib/services/pricing/access";
import { PricingError } from "@/lib/services/pricing/engine";
﻿import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

async function getUser(request: NextRequest) {
  const vendorId = request.method === "GET" ? request.nextUrl.searchParams.get("vendorId") : (await request.clone().json()).vendorId;
  const access = await pricingAccess(request, vendorId);
  if (request.method !== "GET" && access.finance) throw new PricingError("FORBIDDEN", "Finance may configure policies but cannot change vendor fares", 403);
  return access.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const vendorId =
      searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "vendorId is required.",
        },
        { status: 400 }
      );
    }

    const vehicles =
      await prisma.vehicle.findMany({
        where: {
          vendorId,
          deletedAt: null,
        },
        include: {
          driver: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      data: vehicles.map((vehicle) => ({
        id: vehicle.id,
        registrationNumber:
          vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant,
        category: vehicle.category,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        seatingCapacity:
          vehicle.seatingCapacity,
        luggageCapacity:
          vehicle.luggageCapacity,
        homeCity: vehicle.homeCity,
        status: vehicle.status,

        driver: vehicle.driver
          ? {
              id: vehicle.driver.id,
              name:
                vehicle.driver.user?.name ||
                "",
              email:
                vehicle.driver.user?.email ||
                "",
              mobile:
                vehicle.driver.user?.mobile ||
                null,
            }
          : null,
      })),
      count: vehicles.length,
    });
  } catch (error) {
    if (error instanceof PricingError) return pricingResponse(error);
    console.error(
      "GET /api/pricing/vehicles:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch pricing vehicles.",
      },
      { status: 500 }
    );
  }
}
