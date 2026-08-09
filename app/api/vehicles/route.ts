import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, failure } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      Number(searchParams.get("page") || "1")
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(searchParams.get("limit") || "20")
      )
    );

    const search =
      searchParams.get("search")?.trim() || "";

    const status =
      searchParams.get("status")?.trim() || "";

    const category =
      searchParams.get("category")?.trim() || "";

    const skip = (page - 1) * limit;

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

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [vehicles, total] = await Promise.all([
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

    const data = vehicles.map((vehicle) => ({
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
      baseFare: Number(vehicle.baseFare),
      pricePerKm: vehicle.pricePerKm
        ? Number(vehicle.pricePerKm)
        : null,
      waitingCharge:
        vehicle.waitingCharge
          ? Number(vehicle.waitingCharge)
          : null,
      nightCharge:
        vehicle.nightCharge
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
    }));

    return success(
      {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(total / limit),
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
