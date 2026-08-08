import { NextRequest, NextResponse } from "next/server";

import {
  FuelType,
  Prisma,
  TransmissionType,
  VehicleCategory,
  VehicleStatus,
} from "@prisma/client";

import { vehicleService } from "@/lib/services/vehicle/VehicleService";

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[]
): T | undefined {
  return typeof value === "string" &&
    values.includes(value as T)
    ? (value as T)
    : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const vendorId = searchParams.get("vendorId");
    const driverId = searchParams.get("driverId");
    const status = searchParams.get("status");
    const registrationNumber =
      searchParams.get("registrationNumber");

    if (id) {
      const vehicle =
        await vehicleService.getById(id);

      if (!vehicle) {
        return NextResponse.json(
          {
            success: false,
            message: "Vehicle not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: vehicle,
      });
    }

    if (registrationNumber) {
      const vehicle =
        await vehicleService.getByRegistrationNumber(
          registrationNumber
        );

      if (!vehicle) {
        return NextResponse.json(
          {
            success: false,
            message: "Vehicle not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: vehicle,
      });
    }

    if (vendorId) {
      const vehicles =
        await vehicleService.getByVendor(
          vendorId
        );

      return NextResponse.json({
        success: true,
        data: vehicles,
      });
    }

    if (driverId) {
      const vehicles =
        await vehicleService.getByDriver(
          driverId
        );

      return NextResponse.json({
        success: true,
        data: vehicles,
      });
    }

    if (status) {
      const vehicleStatus = enumValue(
        status,
        Object.values(VehicleStatus)
      );

      if (!vehicleStatus) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid vehicle status.",
          },
          { status: 400 }
        );
      }

      const vehicles =
        await vehicleService.getByStatus(
          vehicleStatus
        );

      return NextResponse.json({
        success: true,
        data: vehicles,
      });
    }

    const vehicles =
      await vehicleService.getAll();

    return NextResponse.json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    console.error(
      "GET /api/vehicles:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch vehicles.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    if (
      !body.vendorId ||
      !body.registrationNumber ||
      !body.make ||
      !body.model ||
      !body.category ||
      !body.fuelType ||
      !body.transmission ||
      body.seatingCapacity === undefined ||
      !body.homeCity ||
      body.baseFare === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Required vehicle fields are missing.",
        },
        { status: 400 }
      );
    }

    const category = enumValue(
      body.category,
      Object.values(VehicleCategory)
    );

    const fuelType = enumValue(
      body.fuelType,
      Object.values(FuelType)
    );

    const transmission = enumValue(
      body.transmission,
      Object.values(TransmissionType)
    );

    if (
      !category ||
      !fuelType ||
      !transmission
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid vehicle category, fuel type, or transmission.",
        },
        { status: 400 }
      );
    }

    const data: Prisma.VehicleCreateInput = {
      vendor: {
        connect: {
          id: body.vendorId,
        },
      },

      driver: body.driverId
        ? {
            connect: {
              id: body.driverId,
            },
          }
        : undefined,

      registrationNumber:
        body.registrationNumber,

      make: body.make,
      model: body.model,
      variant: body.variant || null,
      year:
        body.year !== undefined &&
        body.year !== null &&
        body.year !== ""
          ? Number(body.year)
          : null,

      color: body.color || null,

      category,
      fuelType,
      transmission,

      seatingCapacity:
        Number(body.seatingCapacity),

      luggageCapacity:
        body.luggageCapacity !== undefined &&
        body.luggageCapacity !== null &&
        body.luggageCapacity !== ""
          ? Number(body.luggageCapacity)
          : null,

      homeCity: body.homeCity,

      status:
        body.status &&
        enumValue(
          body.status,
          Object.values(VehicleStatus)
        )
          ? enumValue(
              body.status,
              Object.values(VehicleStatus)
            )
          : VehicleStatus.AVAILABLE,

      baseFare: body.baseFare,
      pricePerKm:
        body.pricePerKm ?? null,
      waitingCharge:
        body.waitingCharge ?? null,
      nightCharge:
        body.nightCharge ?? null,

      rating:
        body.rating !== undefined
          ? Number(body.rating)
          : 0,

      totalTrips:
        body.totalTrips !== undefined
          ? Number(body.totalTrips)
          : 0,

      isVerified:
        body.isVerified === true,
    };

    const vehicle =
      await vehicleService.create(data);

    return NextResponse.json(
      {
        success: true,
        message:
          "Vehicle created successfully.",
        data: vehicle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/vehicles:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create vehicle.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle id is required.",
        },
        { status: 400 }
      );
    }

    const {
      id,
      vendorId,
      driverId,
      status,
      category,
      fuelType,
      transmission,
      ...fields
    } = body;

    const data: Prisma.VehicleUpdateInput = {
      ...fields,

      ...(vendorId !== undefined
        ? {
            vendor: {
              connect: {
                id: vendorId,
              },
            },
          }
        : {}),

      ...(driverId !== undefined
        ? {
            driver:
              driverId === null
                ? {
                    disconnect: true,
                  }
                : {
                    connect: {
                      id: driverId,
                    },
                  },
          }
        : {}),

      ...(status !== undefined
        ? {
            status: enumValue(
              status,
              Object.values(VehicleStatus)
            ),
          }
        : {}),

      ...(category !== undefined
        ? {
            category: enumValue(
              category,
              Object.values(VehicleCategory)
            ),
          }
        : {}),

      ...(fuelType !== undefined
        ? {
            fuelType: enumValue(
              fuelType,
              Object.values(FuelType)
            ),
          }
        : {}),

      ...(transmission !== undefined
        ? {
            transmission: enumValue(
              transmission,
              Object.values(TransmissionType)
            ),
          }
        : {}),

      ...(fields.year !== undefined
        ? {
            year:
              fields.year === null ||
              fields.year === ""
                ? null
                : Number(fields.year),
          }
        : {}),

      ...(fields.seatingCapacity !== undefined
        ? {
            seatingCapacity:
              Number(fields.seatingCapacity),
          }
        : {}),

      ...(fields.luggageCapacity !== undefined
        ? {
            luggageCapacity:
              fields.luggageCapacity === null ||
              fields.luggageCapacity === ""
                ? null
                : Number(fields.luggageCapacity),
          }
        : {}),
    };

    const vehicle =
      await vehicleService.update(
        id,
        data
      );

    return NextResponse.json({
      success: true,
      message:
        "Vehicle updated successfully.",
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "PATCH /api/vehicles:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update vehicle.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle id is required.",
        },
        { status: 400 }
      );
    }

    await vehicleService.delete(id);

    return NextResponse.json({
      success: true,
      message:
        "Vehicle deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/vehicles:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete vehicle.",
      },
      { status: 500 }
    );
  }
}