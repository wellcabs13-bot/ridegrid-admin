import { prisma } from "@/lib/prisma";

export class VendorRepository {
  async findBookings(vendorId: string) {
    return prisma.booking.findMany({
      where: {
        vendorId,
        deletedAt: null,
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
        vehicle: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getDashboard(vendorId: string) {
    const [
      vendor,
      totalVehicles,
      activeVehicles,
      totalDrivers,
      totalBookings,
      wallet,
      settlements,
    ] = await Promise.all([
      prisma.vendor.findUnique({
        where: {
          id: vendorId,
        },
        include: {
          user: true,
        },
      }),

      prisma.vehicle.count({
        where: {
          vendorId,
          deletedAt: null,
        },
      }),

      prisma.vehicle.count({
        where: {
          vendorId,
          deletedAt: null,
          status: "AVAILABLE",
        },
      }),

      prisma.driver.count({
        where: {
          vehicles: {
            some: {
              vendorId,
            },
          },
          deletedAt: null,
        },
      }),

      prisma.booking.count({
        where: {
          vendorId,
          deletedAt: null,
        },
      }),

      prisma.vendorWallet.findUnique({
        where: {
          vendorId,
        },
      }),

      prisma.vendorSettlement.findMany({
        where: {
          vendorId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    return {
      vendor,
      statistics: {
        totalVehicles,
        activeVehicles,
        totalDrivers,
        totalBookings,
      },
      wallet,
      settlements,
    };
  }

  async findDrivers(vendorId: string) {
    return prisma.driver.findMany({
      where: {
        deletedAt: null,
        vehicles: {
          some: {
            vendorId,
          },
        },
      },
      include: {
        user: true,
        vehicles: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findProfile(vendorId: string) {
    return prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      include: {
        user: true,
        wallet: true,
        documents: true,
        pricingRules: true,
        reviews: true,
      },
    });
  }

  async findSettlements(vendorId: string) {
    return prisma.vendorSettlement.findMany({
      where: {
        vendorId,
      },
      include: {
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findSmartReturnTrips(vendorId: string) {
    return prisma.trip.findMany({
      where: {
        vehicle: {
          vendorId,
        },
        status: "COMPLETED",
      },
      include: {
        vehicle: true,
        booking: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  }

  async findVehicles(vendorId: string) {
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
        bookings: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
        documents: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findWallet(vendorId: string) {
    return prisma.vendorWallet.findUnique({
      where: {
        vendorId,
      },
      include: {
        transactions: true,
        settlements: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }
}

export const vendorRepository =
  new VendorRepository();