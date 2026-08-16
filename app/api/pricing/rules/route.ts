import { NextRequest, NextResponse } from "next/server";
import {
  PricingType,
  TripType,
  ChargeType,
  VehicleCategory,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

async function getUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const headerToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;

  return authenticate(headerToken ?? cookieToken);
}

function validEnum<T extends Record<string, string>>(
  value: unknown,
  enumObject: T
): value is T[keyof T] {
  return (
    typeof value === "string" &&
    Object.values(enumObject).includes(value)
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        { success: false, message: "vendorId is required." },
        { status: 400 }
      );
    }

    const rules = await prisma.pricingRule.findMany({
      where: {
        vendorId,
      },
      include: {
        dynamicPricingRules: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error) {
    console.error("GET /api/pricing/rules:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch pricing rules.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      vendorId,
      vehicleCategory,
      pricingType,
      tripType,
      chargeType,
      baseFare,
      minimumKm,
      includedKm,
      pricePerKm,
      pricePerHour,
      driverAllowance,
      nightCharge,
      waitingCharge,
      isActive = true,
    } = body;

    if (!vendorId || typeof vendorId !== "string") {
      return NextResponse.json(
        { success: false, message: "vendorId is required." },
        { status: 400 }
      );
    }

    if (!validEnum(vehicleCategory, VehicleCategory)) {
      return NextResponse.json(
        { success: false, message: "Invalid vehicleCategory." },
        { status: 400 }
      );
    }

    if (!validEnum(pricingType, PricingType)) {
      return NextResponse.json(
        { success: false, message: "Invalid pricingType." },
        { status: 400 }
      );
    }

    if (!validEnum(tripType, TripType)) {
      return NextResponse.json(
        { success: false, message: "Invalid tripType." },
        { status: 400 }
      );
    }

    if (!validEnum(chargeType, ChargeType)) {
      return NextResponse.json(
        { success: false, message: "Invalid chargeType." },
        { status: 400 }
      );
    }

    const numericBaseFare = Number(baseFare);

    if (!Number.isFinite(numericBaseFare) || numericBaseFare < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid baseFare." },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Vendor not found." },
        { status: 404 }
      );
    }

    const rule = await prisma.pricingRule.upsert({
      where: {
        vendorId_vehicleCategory_pricingType_tripType: {
          vendorId,
          vehicleCategory,
          pricingType,
          tripType,
        },
      },
      update: {
        chargeType,
        baseFare: numericBaseFare,
        minimumKm:
          minimumKm === null || minimumKm === undefined
            ? null
            : Number(minimumKm),
        includedKm:
          includedKm === null || includedKm === undefined
            ? null
            : Number(includedKm),
        pricePerKm:
          pricePerKm === null || pricePerKm === undefined
            ? null
            : Number(pricePerKm),
        pricePerHour:
          pricePerHour === null || pricePerHour === undefined
            ? null
            : Number(pricePerHour),
        driverAllowance:
          driverAllowance === null || driverAllowance === undefined
            ? null
            : Number(driverAllowance),
        nightCharge:
          nightCharge === null || nightCharge === undefined
            ? null
            : Number(nightCharge),
        waitingCharge:
          waitingCharge === null || waitingCharge === undefined
            ? null
            : Number(waitingCharge),
        isActive: Boolean(isActive),
      },
      create: {
        vendorId,
        vehicleCategory,
        pricingType,
        tripType,
        chargeType,
        baseFare: numericBaseFare,
        minimumKm:
          minimumKm === null || minimumKm === undefined
            ? null
            : Number(minimumKm),
        includedKm:
          includedKm === null || includedKm === undefined
            ? null
            : Number(includedKm),
        pricePerKm:
          pricePerKm === null || pricePerKm === undefined
            ? null
            : Number(pricePerKm),
        pricePerHour:
          pricePerHour === null || pricePerHour === undefined
            ? null
            : Number(pricePerHour),
        driverAllowance:
          driverAllowance === null || driverAllowance === undefined
            ? null
            : Number(driverAllowance),
        nightCharge:
          nightCharge === null || nightCharge === undefined
            ? null
            : Number(nightCharge),
        waitingCharge:
          waitingCharge === null || waitingCharge === undefined
            ? null
            : Number(waitingCharge),
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pricing rule saved successfully.",
        data: rule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/pricing/rules:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save pricing rule.",
      },
      { status: 500 }
    );
  }
}
