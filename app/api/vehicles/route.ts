import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const VehicleCategory = {
  HATCHBACK: "HATCHBACK",
  SEDAN: "SEDAN",
  SUV: "SUV",
  MUV: "MUV",
  LUXURY: "LUXURY",
  TEMPO_TRAVELLER: "TEMPO_TRAVELLER",
  MINI_BUS: "MINI_BUS",
  BUS: "BUS",
} as const;

const FuelType = {
  PETROL: "PETROL",
  DIESEL: "DIESEL",
  CNG: "CNG",
  ELECTRIC: "ELECTRIC",
  HYBRID: "HYBRID",
} as const;

const TransmissionType = {
  MANUAL: "MANUAL",
  AUTOMATIC: "AUTOMATIC",
} as const;

const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  ON_TRIP: "ON_TRIP",
  MAINTENANCE: "MAINTENANCE",
  BLOCKED: "BLOCKED",
} as const;

import { success, failure } from "@/lib/api-response";

function clean(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function nullableString(value: unknown) {
  const valueString = clean(value);
  return valueString || null;
}

function nullableNumber(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function requiredNumber(
  value: unknown,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return Object.values(enumObject).includes(
    value as T[keyof T]
  );
}

function vehicleResponse(vehicle: any) {
  return {
    id: vehicle.id,

    registrationNumber:
      vehicle.registrationNumber,

    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    color: vehicle.color,

    category: vehicle.category,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,

    seatingCapacity:
      vehicle.seatingCapacity,

    luggageCapacity:
      vehicle.luggageCapacity,

    homeCity: vehicle.homeCity,

    status: vehicle.status,

    baseFare:
      Number(vehicle.baseFare),

    pricePerKm:
      vehicle.pricePerKm !== null
        ? Number(vehicle.pricePerKm)
        : null,

    waitingCharge:
      vehicle.waitingCharge !== null
        ? Number(vehicle.waitingCharge)
        : null,

    nightCharge:
      vehicle.nightCharge !== null
        ? Number(vehicle.nightCharge)
        : null,

    rating: vehicle.rating,
    totalTrips: vehicle.totalTrips,
    isVerified: vehicle.isVerified,

    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,

    vendor: vehicle.vendor
      ? {
          id: vehicle.vendor.id,
          companyName:
            vehicle.vendor.companyName,
          name:
            vehicle.vendor.user?.name || "",
          email:
            vehicle.vendor.user?.email || "",
          mobile:
            vehicle.vendor.user?.mobile || null,
        }
      : null,

    driver: vehicle.driver
      ? {
          id: vehicle.driver.id,
          name:
            vehicle.driver.user?.name || "",
          email:
            vehicle.driver.user?.email || "",
          mobile:
            vehicle.driver.user?.mobile || null,
        }
      : null,
  };
}

/* =========================================================
   GET — VEHICLE LIST
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") || "1"
      )
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") || "50"
        )
      )
    );

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const category =
      searchParams
        .get("category")
        ?.trim() || "";

    const skip =
      (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        {
          registrationNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          make: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          model: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          homeCity: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (
      status &&
      isEnumValue(VehicleStatus, status)
    ) {
      where.status = status;
    }

    if (
      category &&
      isEnumValue(
        VehicleCategory,
        category
      )
    ) {
      where.category = category;
    }

    const [
      vehicles,
      total,
    ] = await Promise.all([
      prisma.vehicle.findMany({
        where,

        include: {
          vendor: {
            include: {
              user: true,
            },
          },

          driver: {
            include: {
              user: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip,
        take: limit,
      }),

      prisma.vehicle.count({
        where,
      }),
    ]);

    return success(
      {
        data: vehicles.map(
          vehicleResponse
        ),

        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(
              total / limit
            ),
        },
      },

      "Vehicles fetched successfully."
    );
  } catch (error) {
    console.error(
      "GET /api/vehicles error:",
      error
    );

    return failure(
      "Failed to fetch vehicles.",
      500
    );
  }
}

/* =========================================================
   POST — CREATE VEHICLE
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const vendorId =
      clean(body.vendorId);

    const registrationNumber =
      clean(
        body.registrationNumber ??
          body.registrationNo
      );

    const make =
      clean(
        body.make ??
          body.brand
      );

    const model =
      clean(
        body.model
      );

    const homeCity =
      clean(
        body.homeCity ??
          body.city
      );

    const category =
      clean(body.category);

    const fuelType =
      clean(body.fuelType);

    const transmission =
      clean(body.transmission);

    const seatingCapacity =
      requiredNumber(
        body.seatingCapacity
      );

    if (!vendorId) {
      return failure(
        "Vendor is required.",
        400
      );
    }

    if (!registrationNumber) {
      return failure(
        "Registration number is required.",
        400
      );
    }

    if (!make) {
      return failure(
        "Vehicle make is required.",
        400
      );
    }

    if (!model) {
      return failure(
        "Vehicle model is required.",
        400
      );
    }

    if (!homeCity) {
      return failure(
        "Home city is required.",
        400
      );
    }

    if (
      !isEnumValue(
        VehicleCategory,
        category
      )
    ) {
      return failure(
        "Invalid vehicle category.",
        400
      );
    }

    if (
      !isEnumValue(
        FuelType,
        fuelType
      )
    ) {
      return failure(
        "Invalid fuel type.",
        400
      );
    }

    if (
      !isEnumValue(
        TransmissionType,
        transmission
      )
    ) {
      return failure(
        "Invalid transmission type.",
        400
      );
    }

    if (seatingCapacity <= 0) {
      return failure(
        "Seating capacity must be greater than zero.",
        400
      );
    }

    const vendor =
      await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          deletedAt: null,
        },
      });

    if (!vendor) {
      return failure(
        "Selected vendor was not found or is inactive.",
        400
      );
    }

    const existingVehicle =
      await prisma.vehicle.findUnique({
        where: {
          registrationNumber,
        },
      });

    if (
      existingVehicle &&
      !existingVehicle.deletedAt
    ) {
      return failure(
        "A vehicle with this registration number already exists.",
        409
      );
    }

    const vehicle =
      existingVehicle
        ? await prisma.vehicle.update({
            where: {
              id: existingVehicle.id,
            },

            data: {
              deletedAt: null,
              vendorId,
              registrationNumber,
              make,
              model,
              variant:
                nullableString(
                  body.variant
                ),
              year:
                nullableNumber(
                  body.year
                ),
              color:
                nullableString(
                  body.color
                ),
              category,
              fuelType,
              transmission,
              seatingCapacity,
              luggageCapacity:
                nullableNumber(
                  body.luggageCapacity
                ),
              homeCity,

              status: (isEnumValue(VehicleStatus, clean(body.status)) ? clean(body.status) : VehicleStatus.AVAILABLE) as any,

              baseFare:
                requiredNumber(
                  body.baseFare
                ),

              pricePerKm:
                nullableNumber(
                  body.pricePerKm
                ),

              waitingCharge:
                nullableNumber(
                  body.waitingCharge
                ),

              nightCharge:
                nullableNumber(
                  body.nightCharge
                ),
            },

            include: {
              vendor: {
                include: {
                  user: true,
                },
              },
              driver: {
                include: {
                  user: true,
                },
              },
            },
          })
        : await prisma.vehicle.create({
            data: {
              vendorId,

              registrationNumber,

              make,

              model,

              variant:
                nullableString(
                  body.variant
                ),

              year:
                nullableNumber(
                  body.year
                ),

              color:
                nullableString(
                  body.color
                ),

              category,

              fuelType,

              transmission,

              seatingCapacity,

              luggageCapacity:
                nullableNumber(
                  body.luggageCapacity
                ),

              homeCity,

              status: (isEnumValue(VehicleStatus, clean(body.status)) ? clean(body.status) : VehicleStatus.AVAILABLE) as any,

              baseFare:
                requiredNumber(
                  body.baseFare
                ),

              pricePerKm:
                nullableNumber(
                  body.pricePerKm
                ),

              waitingCharge:
                nullableNumber(
                  body.waitingCharge
                ),

              nightCharge:
                nullableNumber(
                  body.nightCharge
                ),
            },

            include: {
              vendor: {
                include: {
                  user: true,
                },
              },

              driver: {
                include: {
                  user: true,
                },
              },
            },
          });

    return success(
      vehicleResponse(vehicle),
      existingVehicle
        ? "Vehicle restored successfully."
        : "Vehicle created successfully."
    );
  } catch (error: any) {
    console.error(
      "POST /api/vehicles error:",
      error
    );

    if (
      error?.code === "P2002"
    ) {
      return failure(
        "A vehicle with this registration number already exists.",
        409
      );
    }

    return failure(
      "Failed to create vehicle.",
      500
    );
  }
}

/* =========================================================
   PUT — UPDATE VEHICLE
========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      clean(body.id);

    if (!id) {
      return failure(
        "Vehicle ID is required.",
        400
      );
    }

    const existing =
      await prisma.vehicle.findUnique({
        where: { id },
      });

    if (!existing || existing.deletedAt) {
      return failure(
        "Vehicle not found.",
        404
      );
    }

    const data: any = {};

    if (
      body.vendorId !==
      undefined
    ) {
      const vendorId =
        clean(body.vendorId);

      if (!vendorId) {
        return failure(
          "Vendor is required.",
          400
        );
      }

      const vendor =
        await prisma.vendor.findFirst({
          where: {
            id: vendorId,
            deletedAt: null,
          },
        });

      if (!vendor) {
        return failure(
          "Selected vendor was not found or is inactive.",
          400
        );
      }

      data.vendorId =
        vendorId;
    }

    if (
      body.registrationNumber !==
        undefined ||
      body.registrationNo !==
        undefined
    ) {
      data.registrationNumber =
        clean(
          body.registrationNumber ??
            body.registrationNo
        );
    }

    if (
      body.make !== undefined ||
      body.brand !== undefined
    ) {
      data.make = clean(
        body.make ??
          body.brand
      );
    }

    if (
      body.model !== undefined
    ) {
      data.model =
        clean(body.model);
    }

    if (
      body.variant !==
      undefined
    ) {
      data.variant =
        nullableString(
          body.variant
        );
    }

    if (
      body.year !== undefined
    ) {
      data.year =
        nullableNumber(
          body.year
        );
    }

    if (
      body.color !==
      undefined
    ) {
      data.color =
        nullableString(
          body.color
        );
    }

    if (
      body.category !==
      undefined
    ) {
      if (
        !isEnumValue(
          VehicleCategory,
          clean(body.category)
        )
      ) {
        return failure(
          "Invalid vehicle category.",
          400
        );
      }

      data.category =
        clean(body.category);
    }

    if (
      body.fuelType !==
      undefined
    ) {
      if (
        !isEnumValue(
          FuelType,
          clean(body.fuelType)
        )
      ) {
        return failure(
          "Invalid fuel type.",
          400
        );
      }

      data.fuelType =
        clean(body.fuelType);
    }

    if (
      body.transmission !==
      undefined
    ) {
      if (
        !isEnumValue(
          TransmissionType,
          clean(body.transmission)
        )
      ) {
        return failure(
          "Invalid transmission type.",
          400
        );
      }

      data.transmission =
        clean(body.transmission);
    }

    if (
      body.seatingCapacity !==
      undefined
    ) {
      data.seatingCapacity =
        requiredNumber(
          body.seatingCapacity
        );
    }

    if (
      body.luggageCapacity !==
      undefined
    ) {
      data.luggageCapacity =
        nullableNumber(
          body.luggageCapacity
        );
    }

    if (
      body.homeCity !==
        undefined ||
      body.city !==
        undefined
    ) {
      data.homeCity =
        clean(
          body.homeCity ??
            body.city
        );
    }

    if (
      body.status !==
      undefined
    ) {
      const newStatus =
        clean(body.status);

      if (
        !isEnumValue(
          VehicleStatus,
          newStatus
        )
      ) {
        return failure(
          "Invalid vehicle status.",
          400
        );
      }

      data.status =
        newStatus;
    }

    if (
      body.baseFare !==
      undefined
    ) {
      data.baseFare =
        requiredNumber(
          body.baseFare
        );
    }

    if (
      body.pricePerKm !==
      undefined
    ) {
      data.pricePerKm =
        nullableNumber(
          body.pricePerKm
        );
    }

    if (
      body.waitingCharge !==
      undefined
    ) {
      data.waitingCharge =
        nullableNumber(
          body.waitingCharge
        );
    }

    if (
      body.nightCharge !==
      undefined
    ) {
      data.nightCharge =
        nullableNumber(
          body.nightCharge
        );
    }

    const vehicle =
      await prisma.vehicle.update({
        where: { id },

        data,

        include: {
          vendor: {
            include: {
              user: true,
            },
          },

          driver: {
            include: {
              user: true,
            },
          },
        },
      });

    return success(
      vehicleResponse(vehicle),
      "Vehicle updated successfully."
    );
  } catch (error: any) {
    console.error(
      "PUT /api/vehicles error:",
      error
    );

    if (
      error?.code === "P2002"
    ) {
      return failure(
        "A vehicle with this registration number already exists.",
        409
      );
    }

    return failure(
      "Failed to update vehicle.",
      500
    );
  }
}

/* =========================================================
   DELETE — SOFT DELETE VEHICLE
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    let id =
      searchParams.get("id") ||
      "";

    if (!id) {
      try {
        const body =
          await request.json();

        id = clean(body.id);
      } catch {
        // No body is acceptable.
      }
    }

    if (!id) {
      return failure(
        "Vehicle ID is required.",
        400
      );
    }

    const existing =
      await prisma.vehicle.findUnique({
        where: { id },
      });

    if (!existing || existing.deletedAt) {
      return failure(
        "Vehicle not found.",
        404
      );
    }

    const vehicle =
      await prisma.vehicle.update({
        where: { id },

        data: {
          deletedAt: new Date(),
        },
      });

    return success(
      {
        id: vehicle.id,
      },
      "Vehicle deleted successfully."
    );
  } catch (error) {
    console.error(
      "DELETE /api/vehicles error:",
      error
    );

    return failure(
      "Failed to delete vehicle.",
      500
    );
  }
}