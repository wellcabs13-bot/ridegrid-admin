import {
  Prisma,
  VehicleStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class VehicleRepository {
  async findAll(
    where: Prisma.VehicleWhereInput = {}
  ) {
    return prisma.vehicle.findMany({
      where: {
        deletedAt: null,
        ...where,
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
        documents: true,
        gpsDevice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
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
        bookings: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        trips: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        documents: true,
        reviews: true,
        performanceReports: {
          orderBy: {
            reportDate: "desc",
          },
          take: 20,
        },
        analytics: {
          orderBy: {
            reportDate: "desc",
          },
          take: 20,
        },
        maintenanceRecords: {
          orderBy: {
            serviceDate: "desc",
          },
        },
        fuelLogs: {
          orderBy: {
            filledAt: "desc",
          },
          take: 20,
        },
        serviceSchedules: {
          orderBy: {
            dueDate: "asc",
          },
        },
        breakdowns: {
          orderBy: {
            breakdownTime: "desc",
          },
        },
        dometerLogs: {
          orderBy: {
            recordedAt: "desc",
          },
          take: 20,
        },
        gpsDevice: true,
        tripLocations: {
          orderBy: {
            recordedAt: "desc",
          },
          take: 50,
        },
        routeDeviations: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        sosEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        geofenceEvents: {
          orderBy: {
            eventTime: "desc",
          },
          take: 20,
        },
      },
    });
  }

  async findByRegistrationNumber(
    registrationNumber: string
  ) {
    return prisma.vehicle.findUnique({
      where: {
        registrationNumber,
      },
      include: {
        vendor: true,
        driver: {
          include: {
            user: true,
          },
        },
        documents: true,
      },
    });
  }

  async findByVendor(vendorId: string) {
    return prisma.vehicle.findMany({
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
        documents: true,
        gpsDevice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByDriver(driverId: string) {
    return prisma.vehicle.findMany({
      where: {
        driverId,
        deletedAt: null,
      },
      include: {
        vendor: true,
        documents: true,
        gpsDevice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByStatus(status: VehicleStatus) {
    return prisma.vehicle.findMany({
      where: {
        status,
        deletedAt: null,
      },
      include: {
        vendor: true,
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
  }

  async create(
    data: Prisma.VehicleCreateInput
  ) {
    return prisma.vehicle.create({
      data,
      include: {
        vendor: true,
        driver: {
          include: {
            user: true,
          },
        },
        documents: true,
        gpsDevice: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.VehicleUpdateInput
  ) {
    return prisma.vehicle.update({
      where: {
        id,
      },
      data,
      include: {
        vendor: true,
        driver: {
          include: {
            user: true,
          },
        },
        documents: true,
        gpsDevice: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: VehicleStatus
  ) {
    return prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  async assignDriver(
    id: string,
    driverId: string | null
  ) {
    return prisma.vehicle.update({
      where: {
        id,
      },
      data:
        driverId === null
          ? {
              driver: {
                disconnect: true,
              },
            }
          : {
              driver: {
                connect: {
                  id: driverId,
                },
              },
            },
    });
  }

  async softDelete(id: string) {
    return prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        status:
          VehicleStatus.BLOCKED,
      },
    });
  }

  async count(
    where: Prisma.VehicleWhereInput = {}
  ) {
    return prisma.vehicle.count({
      where: {
        deletedAt: null,
        ...where,
      },
    });
  }

  /**
   * Marketplace availability search.
   *
   * Returns only verified and available
   * vehicles and removes vehicles that
   * already have an active booking or trip
   * around the requested pickup time.
   */
  async findMarketplaceAvailable(
    where: Prisma.VehicleWhereInput,
    pickupDateTime?: Date
  ) {
    const vehicles =
      await prisma.vehicle.findMany({
        where: {
          ...where,
          deletedAt: null,
          status:
            VehicleStatus.AVAILABLE,
          isVerified: true,
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

          bookings: {
            where: {
              deletedAt: null,
              status: {
                in: [
                  "PENDING",
                  "CONFIRMED",
                  "DRIVER_ASSIGNED",
                  "TRIP_STARTED",
                ],
              },

              ...(pickupDateTime
                ? {
                    pickupDateTime: {
                      gte: new Date(
                        pickupDateTime.getTime() -
                          24 *
                            60 *
                            60 *
                            1000
                      ),
                      lte: new Date(
                        pickupDateTime.getTime() +
                          24 *
                            60 *
                            60 *
                            1000
                      ),
                    },
                  }
                : {}),
            },

            select: {
              id: true,
              pickupDateTime: true,
              status: true,
            },
          },

          trips: {
            where: {
              deletedAt: null,
              status: {
                in: [
                  "ASSIGNED",
                  "STARTED",
                  "ARRIVED_AT_PICKUP",
                  "PASSENGER_ONBOARD",
                ],
              },
            },

            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
        },

        orderBy: [
          {
            rating: "desc",
          },
          {
            totalTrips: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    if (!pickupDateTime) {
      return vehicles;
    }

    return vehicles.filter(
      (vehicle) => {
        const hasBookingConflict =
          vehicle.bookings.length > 0;

        const hasTripConflict =
          vehicle.trips.some(
            (trip) => {
              /*
               * If an active trip does not yet
               * have timing information,
               * conservatively consider the
               * vehicle occupied.
               */
              if (
                !trip.startTime &&
                !trip.endTime
              ) {
                return true;
              }

              const start =
                trip.startTime ??
                trip.endTime!;

              const end =
                trip.endTime ??
                trip.startTime!;

              return (
                pickupDateTime >= start &&
                pickupDateTime <= end
              );
            }
          );

        return (
          !hasBookingConflict &&
          !hasTripConflict
        );
      }
    );
  }

  async getStats() {
    const [
      total,
      available,
      reserved,
      onTrip,
      maintenance,
      blocked,
      verified,
    ] = await Promise.all([
      this.count(),

      this.count({
        status:
          VehicleStatus.AVAILABLE,
      }),

      this.count({
        status:
          VehicleStatus.RESERVED,
      }),

      this.count({
        status:
          VehicleStatus.ON_TRIP,
      }),

      this.count({
        status:
          VehicleStatus.MAINTENANCE,
      }),

      this.count({
        status:
          VehicleStatus.BLOCKED,
      }),

      this.count({
        isVerified: true,
      }),
    ]);

    return {
      total,
      available,
      reserved,
      onTrip,
      maintenance,
      blocked,
      verified,
    };
  }
}

export const vehicleRepository =
  new VehicleRepository();