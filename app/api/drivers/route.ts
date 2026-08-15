import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole, DriverStatus } from "@prisma/client";

function serializeDriver(driver: any) {
  const vehicle = driver.vehicles?.[0] ?? null;

  return {
    id: driver.id,

    name: `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim(),

    photo: "",

    mobile: driver.user?.mobile ?? "",
    email: driver.user?.email ?? "",

    licenseNumber: driver.licenseNumber ?? "",
    licenseExpiry: "",

    aadhaar: "",
    address: "",
    city: "",
    state: "",
    pincode: "",

    joinDate:
      driver.createdAt instanceof Date
        ? driver.createdAt.toISOString()
        : driver.createdAt ?? "",

    experience: "",

    vehicle:
      vehicle?.vehicleType ??
      vehicle?.model ??
      "",

    vehicleNumber:
      vehicle?.registrationNumber ?? "",

    vehicleId: vehicle?.id ?? null,

    vendorId: vehicle?.vendorId ?? null,

    trips:
      driver.bookings?.length ?? 0,

    rating: 0,

    earnings:
      driver.bookings?.reduce(
        (sum: number, booking: any) =>
          sum + Number(booking.driverPayout ?? 0),
        0
      ) ?? 0,

    wallet: 0,

    availability: "Available" as const,

    status:
      driver.deletedAt
        ? ("Inactive" as const)
        : driver.status === DriverStatus.SUSPENDED
          ? ("Suspended" as const)
          : driver.status === DriverStatus.INACTIVE
            ? ("Inactive" as const)
            : ("Active" as const),
  };
}

function parseStatus(value: unknown): DriverStatus {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();

  if (status === "SUSPENDED") {
    return DriverStatus.SUSPENDED;
  }

  if (status === "INACTIVE") {
    return DriverStatus.INACTIVE;
  }

  return DriverStatus.ACTIVE;
}

async function getDriverById(id: string) {
  return prisma.driver.findUnique({
    where: {
      id,
    },

    include: {
      user: true,

      vehicles: true,

      bookings: {
        select: {
          driverPayout: true,
        },
      },
    },
  });
}

/* =========================================================
   GET — DRIVER LIST
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const search =
      searchParams.get("search")?.trim() ?? "";

    const status =
      searchParams.get("status")?.trim() ?? "";

    const page = Math.max(
      Number(searchParams.get("page") ?? "1"),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") ?? "50"),
        1
      ),
      100
    );

    const where: any = {};

    /*
     * Status filtering.
     *
     * Deleted drivers remain soft-deleted.
     * Active / Suspended / Inactive are now
     * represented by Driver.status.
     */

    if (status === "Inactive") {
      where.OR = [
        {
          status: DriverStatus.INACTIVE,
        },
        {
          deletedAt: {
            not: null,
          },
        },
      ];
    } else if (status === "Suspended") {
      where.status = DriverStatus.SUSPENDED;
      where.deletedAt = null;
    } else {
      /*
       * Default list excludes deleted drivers.
       */
      where.deletedAt = null;

      if (status === "Active") {
        where.status = DriverStatus.ACTIVE;
      }
    }

    if (search) {
      const searchConditions = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          licenseNumber: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          user: {
            mobile: {
              contains: search,
            },
          },
        },
      ];

      /*
       * Preserve status filtering while adding search.
       */
      if (where.OR) {
        const existingStatusCondition = where.OR;

        where.AND = [
          {
            OR: existingStatusCondition,
          },
          {
            OR: searchConditions,
          },
        ];

        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [drivers, total] =
      await Promise.all([
        prisma.driver.findMany({
          where,

          include: {
            user: true,

            vehicles: true,

            bookings: {
              select: {
                driverPayout: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        prisma.driver.count({
          where,
        }),
      ]);

    return NextResponse.json({
      success: true,

      data: drivers.map(
        serializeDriver
      ),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "GET /api/drivers",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load drivers.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST — CREATE DRIVER
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const firstName =
      String(
        body.firstName ?? ""
      ).trim();

    const lastName =
      String(
        body.lastName ?? ""
      ).trim();

    const email =
      String(
        body.email ?? ""
      )
        .trim()
        .toLowerCase();

    const mobile =
      String(
        body.mobile ?? ""
      ).trim();

    const licenseNumber =
      String(
        body.licenseNumber ?? ""
      ).trim();

    const vehicleId =
      String(
        body.vehicleId ?? ""
      ).trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !licenseNumber
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "First name, last name, email and license number are required.",
        },

        {
          status: 400,
        }
      );
    }

    /*
     * Email must be unique.
     */
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,

          message:
            "A user with this email already exists.",
        },

        {
          status: 409,
        }
      );
    }

    /*
     * Licence must be unique.
     */
    const existingLicense =
      await prisma.driver.findUnique({
        where: {
          licenseNumber,
        },
      });

    if (existingLicense) {
      return NextResponse.json(
        {
          success: false,

          message:
            "A driver with this license number already exists.",
        },

        {
          status: 409,
        }
      );
    }

    /*
     * If a vehicle was selected,
     * verify that it exists and is not already
     * assigned to another driver.
     */
    if (vehicleId) {
      const vehicle =
        await prisma.vehicle.findFirst({
          where: {
            id: vehicleId,
            deletedAt: null,
          },
        });

      if (!vehicle) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected vehicle was not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (vehicle.driverId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected vehicle is already assigned to another driver.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const driver =
      await prisma.$transaction(
        async (tx) => {
          const createdDriver =
            await tx.driver.create({
              data: {
                firstName,

                lastName,

                licenseNumber,

                status:
                  DriverStatus.ACTIVE,

                user: {
                  create: {
                    name:
                      `${firstName} ${lastName}`.trim(),

                    email,

                    mobile:
                      mobile || null,

                    password:
                      String(
                        body.password ??
                          "ChangeMe@123"
                      ),

                    role:
                      UserRole.DRIVER,
                  },
                },
              },

              include: {
                user: true,

                vehicles: true,

                bookings: {
                  select: {
                    driverPayout:
                      true,
                  },
                },
              },
            });

          /*
           * Assign selected vehicle
           * after driver creation.
           */
          if (vehicleId) {
            await tx.vehicle.update({
              where: {
                id: vehicleId,
              },

              data: {
                driverId:
                  createdDriver.id,
              },
            });
          }

          return tx.driver.findUnique({
            where: {
              id:
                createdDriver.id,
            },

            include: {
              user: true,

              vehicles: true,

              bookings: {
                select: {
                  driverPayout:
                    true,
                },
              },
            },
          });
        }
      );

    return NextResponse.json(
      {
        success: true,

        data:
          serializeDriver(
            driver
          ),
      },

      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/drivers",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to create driver.",
      },

      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT — EDIT DRIVER
========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      String(
        body.id ?? ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Driver ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await getDriverById(id);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Driver not found.",
        },
        {
          status: 404,
        }
      );
    }

    const firstName =
      body.firstName !== undefined
        ? String(
            body.firstName
          ).trim()
        : existing.firstName;

    const lastName =
      body.lastName !== undefined
        ? String(
            body.lastName
          ).trim()
        : existing.lastName;

    const email =
      body.email !== undefined
        ? String(
            body.email
          )
            .trim()
            .toLowerCase()
        : existing.user?.email ??
          "";

    const mobile =
      body.mobile !== undefined
        ? String(
            body.mobile
          ).trim()
        : existing.user?.mobile ??
          "";

    const licenseNumber =
      body.licenseNumber !== undefined
        ? String(
            body.licenseNumber
          ).trim()
        : existing.licenseNumber;

    const status =
      parseStatus(
        body.status ??
          existing.status
      );

    const requestedVehicleId =
      body.vehicleId !== undefined
        ? String(
            body.vehicleId ?? ""
          ).trim()
        : undefined;

    /*
     * Check email conflict.
     */
    if (
      email &&
      email !== existing.user?.email
    ) {
      const emailOwner =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      if (
        emailOwner &&
        emailOwner.id !==
          existing.userId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Another user already uses this email.",
          },
          {
            status: 409,
          }
        );
      }
    }

    /*
     * Check licence conflict.
     */
    if (
      licenseNumber &&
      licenseNumber !==
        existing.licenseNumber
    ) {
      const licenseOwner =
        await prisma.driver.findUnique({
          where: {
            licenseNumber,
          },
        });

      if (
        licenseOwner &&
        licenseOwner.id !== id
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Another driver already uses this license number.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const updated =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Determine currently assigned
           * vehicle.
           */
          const currentVehicle =
            await tx.vehicle.findFirst({
              where: {
                driverId: id,
              },
            });

          /*
           * If vehicle assignment is being
           * changed, validate new vehicle.
           */
          if (
            requestedVehicleId !==
              undefined &&
            requestedVehicleId !==
              (currentVehicle?.id ?? "")
          ) {
            if (
              requestedVehicleId
            ) {
              const newVehicle =
                await tx.vehicle.findFirst(
                  {
                    where: {
                      id:
                        requestedVehicleId,

                      deletedAt: null,
                    },
                  }
                );

              if (!newVehicle) {
                throw new Error(
                  "Selected vehicle was not found."
                );
              }

              if (
                newVehicle.driverId &&
                newVehicle.driverId !==
                  id
              ) {
                throw new Error(
                  "Selected vehicle is already assigned to another driver."
                );
              }
            }

            /*
             * Release old vehicle.
             */
            if (currentVehicle) {
              await tx.vehicle.update({
                where: {
                  id:
                    currentVehicle.id,
                },

                data: {
                  driverId:
                    null,
                },
              });
            }

            /*
             * Assign new vehicle.
             */
            if (
              requestedVehicleId
            ) {
              await tx.vehicle.update({
                where: {
                  id:
                    requestedVehicleId,
                },

                data: {
                  driverId:
                    id,
                },
              });
            }
          }

          /*
           * Update Driver.
           */
          await tx.driver.update({
            where: {
              id,
            },

            data: {
              firstName,
              lastName,
              licenseNumber,
              status,
            },
          });

          /*
           * Update linked User.
           */
          if (existing.userId) {
            await tx.user.update({
              where: {
                id:
                  existing.userId,
              },

              data: {
                name:
                  `${firstName} ${lastName}`.trim(),

                email: email || existing.user?.email || "",

                mobile:
                  mobile || null,
              },
            });
          }

          /*
           * Return complete updated driver.
           */
          return tx.driver.findUnique({
            where: {
              id,
            },

            include: {
              user: true,

              vehicles: true,

              bookings: {
                select: {
                  driverPayout:
                    true,
                },
              },
            },
          });
        }
      );

    return NextResponse.json({
      success: true,

      message:
        "Driver updated successfully.",

      data:
        serializeDriver(
          updated
        ),
    });
  } catch (error) {
    console.error(
      "PUT /api/drivers",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to update driver.",
      },

      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE — SOFT DELETE DRIVER
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      String(
        body.id ?? ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Driver ID is required.",
        },

        {
          status: 400,
        }
      );
    }

    const existing =
      await prisma.driver.findUnique({
        where: {
          id,
        },

        include: {
          vehicles: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Driver not found.",
        },

        {
          status: 404,
        }
      );
    }

    await prisma.$transaction(
      async (tx) => {
        /*
         * CRITICAL:
         * Release every vehicle assigned
         * to this driver.
         */
        await tx.vehicle.updateMany({
          where: {
            driverId: id,
          },

          data: {
            driverId: null,
          },
        });

        /*
         * Soft delete the driver.
         * Historical records remain intact.
         */
        await tx.driver.update({
          where: {
            id,
          },

          data: {
            deletedAt:
              new Date(),

            status:
              DriverStatus.INACTIVE,
          },
        });
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Driver deleted successfully. Assigned vehicle(s) are now available for reassignment.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/drivers",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to delete driver.",
      },

      {
        status: 500,
      }
    );
  }
}
