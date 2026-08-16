import { NextRequest, NextResponse } from "next/server";

import {
  PricingType,
  TripType,
  ChargeType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

async function getUser(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  const headerToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;

  return authenticate(
    headerToken ?? cookieToken
  );
}

function enumValue<T extends Record<string, string>>(
  value: unknown,
  object: T
): value is T[keyof T] {
  return (
    typeof value === "string" &&
    Object.values(object).includes(value)
  );
}

function numberOrNull(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(
      "Invalid numeric pricing value."
    );
  }

  return number;
}

export async function GET(
  request: NextRequest
) {
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

    const vehicleId =
      searchParams.get("vehicleId");

    const city =
      searchParams.get("city");

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "vendorId is required.",
        },
        { status: 400 }
      );
    }

    const packages =
      await prisma.pricingPackage.findMany({
        where: {
          vehicle: {
            vendorId,
            deletedAt: null,
          },

          ...(vehicleId
            ? { vehicleId }
            : {}),

          ...(city
            ? { city }
            : {}),
        },

        include: {
          vehicle: {
            include: {
              driver: {
                include: {
                  user: true,
                },
              },
            },
          },

          pricingRule: true,
        },

        orderBy: [
          {
            city: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      data: packages,
      count: packages.length,
    });
  } catch (error) {
    console.error(
      "GET /api/pricing/packages:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch pricing packages.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
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

    const body = await request.json();

    const {
      vendorId,
      vehicleId,
      city,
      fromCity,
      toCity,
      extraPickupCharge,
      extraDropCharge,
      pricingType,
      tripType,
      chargeType,
      packageType,
      packageName,
      includedHours,
      includedKm,
      baseFare,
      extraKmRate,
      extraHourRate,
      driverAllowance,
      nightCharge,
      tollCharge,
      parkingCharge,
      otherCharges,
      airportName,
      transferDirection,
      isActive,
    } = body;

    if (
      typeof vendorId !== "string" ||
      !vendorId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof vehicleId !== "string" ||
      !vehicleId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle is required.",
        },
        { status: 400 }
      );
    }

    const effectiveTripType =
      enumValue(tripType, TripType)
        ? tripType
        : TripType.ONEWAY;
    if (
      typeof city !== "string" ||
      !city.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Pricing city is required.",
        },
        { status: 400 }
      );
    }
    if (
      pricingType === PricingType.OUTSTATION &&
      effectiveTripType === TripType.ONEWAY
    ) {
      if (
        typeof fromCity !== "string" ||
        !fromCity.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "From City is required for Outstation One Way pricing.",
          },
          { status: 400 }
        );
      }

      if (
        typeof toCity !== "string" ||
        !toCity.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "To City is required for Outstation One Way pricing.",
          },
          { status: 400 }
        );
      }

      if (
        fromCity.trim().toLowerCase() ===
        toCity.trim().toLowerCase()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "From City and To City must be different.",
          },
          { status: 400 }
        );
      }
    }

    if (
      !enumValue(
        pricingType,
        PricingType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid pricing type.",
        },
        { status: 400 }
      );
    }


    const effectiveChargeType =
      enumValue(
        chargeType,
        ChargeType
      )
        ? chargeType
        : ChargeType.FIXED;

    if (
      typeof packageName !==
        "string" ||
      !packageName.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Package name is required.",
        },
        { status: 400 }
      );
    }

    const base =
      Number(baseFare);

    if (
      !Number.isFinite(base) ||
      base < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid base fare is required.",
        },
        { status: 400 }
      );
    }

    const vehicle =
      await prisma.vehicle.findFirst({
        where: {
          id: vehicleId,
          vendorId,
          deletedAt: null,
        },

        select: {
          id: true,
          vendorId: true,
          category: true,
        },
      });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vehicle does not belong to the selected vendor.",
        },
        { status: 409 }
      );
    }

    const rule =
      await prisma.pricingRule.upsert({
        where: {
          vendorId_vehicleCategory_pricingType_tripType:
            {
              vendorId,
              vehicleCategory:
                vehicle.category,
              pricingType,
              tripType:
                effectiveTripType,
            },
        },

        update: {
          chargeType:
            effectiveChargeType,

          baseFare: base,

          includedKm:
            numberOrNull(includedKm),

          pricePerKm:
            numberOrNull(
              extraKmRate
            ),

          pricePerHour:
            numberOrNull(
              extraHourRate
            ),

          driverAllowance:
            numberOrNull(
              driverAllowance
            ),

          nightCharge:
            numberOrNull(
              nightCharge
            ),

          isActive:
            isActive !== false,
        },

        create: {
          vendorId,

          vehicleCategory:
            vehicle.category,

          pricingType,

          tripType:
            effectiveTripType,

          chargeType:
            effectiveChargeType,

          baseFare: base,

          includedKm:
            numberOrNull(includedKm),

          pricePerKm:
            numberOrNull(
              extraKmRate
            ),

          pricePerHour:
            numberOrNull(
              extraHourRate
            ),

          driverAllowance:
            numberOrNull(
              driverAllowance
            ),

          nightCharge:
            numberOrNull(
              nightCharge
            ),

          isActive:
            isActive !== false,
        },
      });

    const normalizedCity =
      city.trim();

    const normalizedPackageName =
      packageName.trim();

    const existing =
      await prisma.pricingPackage.findFirst({
        where: {
          vehicleId,
          pricingRuleId: rule.id,
          city: normalizedCity,
          packageName:
            normalizedPackageName,
          fromCity:
            pricingType === PricingType.OUTSTATION
              ? fromCity.trim()
              : null,
          toCity:
            pricingType === PricingType.OUTSTATION
              ? toCity.trim()
              : null,
        },
      });

    const packageData = {
      packageType:
        typeof packageType ===
          "string" &&
        packageType.trim()
          ? packageType.trim()
          : pricingType,

      packageName:
        normalizedPackageName,

      city:
        normalizedCity,

      includedHours:
        includedHours === "" ||
        includedHours === null ||
        includedHours ===
          undefined
          ? null
          : Number(includedHours),

      includedKm:
        numberOrNull(includedKm),

      baseFare: base,

      extraKmRate:
        numberOrNull(
          extraKmRate
        ),

      extraHourRate:
        numberOrNull(
          extraHourRate
        ),

      driverAllowance:
        numberOrNull(
          driverAllowance
        ),

      nightCharge:
        numberOrNull(
          nightCharge
        ),

      tollCharge:
        numberOrNull(
          tollCharge
        ),

      parkingCharge:
        numberOrNull(
          parkingCharge
        ),

      otherCharges:
        numberOrNull(
          otherCharges
        ),

      airportName:
        typeof airportName ===
          "string" &&
        airportName.trim()
          ? airportName.trim()
          : null,

      transferDirection:
        typeof transferDirection ===
          "string" &&
        transferDirection.trim()
          ? transferDirection.trim()
          : null,

      isActive:
        isActive !== false,
    };

    const saved =
      existing
        ? await prisma.pricingPackage.update({
            where: {
              id: existing.id,
            },

            data: packageData,
          })
        : await prisma.pricingPackage.create({
            data: {
              pricingRuleId:
                rule.id,

              vehicleId,

              ...packageData,
            },
          });

    return NextResponse.json(
      {
        success: true,

        message:
          existing
            ? "Pricing package updated successfully."
            : "Pricing package created successfully.",

        data: saved,
      },

      {
        status:
          existing ? 200 : 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/pricing/packages:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to save pricing package.",
      },

      {
        status: 500,
      }
    );
  }
}



