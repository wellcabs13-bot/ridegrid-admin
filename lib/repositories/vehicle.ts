import { Prisma, VehicleStatus } from "@prisma/client";

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
      data: {
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
        status: VehicleStatus.BLOCKED,
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
        status: VehicleStatus.AVAILABLE,
      }),

      this.count({
        status: VehicleStatus.RESERVED,
      }),

      this.count({
        status: VehicleStatus.ON_TRIP,
      }),

      this.count({
        status: VehicleStatus.MAINTENANCE,
      }),

      this.count({
        status: VehicleStatus.BLOCKED,
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