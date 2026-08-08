import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class AnalyticsRepository {
  async getDailyReports(
    from?: Date,
    to?: Date
  ) {
    return prisma.dailyReport.findMany({
      where: {
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: {
        reportDate: "asc",
      },
    });
  }

  async getRevenueSummaries(
    from?: Date,
    to?: Date,
    vendorId?: string
  ) {
    return prisma.revenueSummary.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(from || to
          ? {
              periodStart: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        vendor: true,
      },
      orderBy: {
        periodStart: "asc",
      },
    });
  }

  async getVendorPerformance(
    from?: Date,
    to?: Date,
    vendorId?: string
  ) {
    return prisma.vendorPerformance.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        vendor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        reportDate: "desc",
      },
    });
  }

  async getDriverPerformance(
    from?: Date,
    to?: Date,
    driverId?: string
  ) {
    return prisma.driverPerformance.findMany({
      where: {
        ...(driverId ? { driverId } : {}),
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        reportDate: "desc",
      },
    });
  }

  async getVehiclePerformance(
    from?: Date,
    to?: Date,
    vehicleId?: string
  ) {
    return prisma.vehiclePerformance.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        vehicle: true,
      },
      orderBy: {
        reportDate: "desc",
      },
    });
  }

  async getBookingAnalytics(
    from?: Date,
    to?: Date
  ) {
    return prisma.bookingAnalytics.findMany({
      where: {
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        booking: true,
        customer: {
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

  async getVendorAnalytics(
    from?: Date,
    to?: Date,
    vendorId?: string
  ) {
    return prisma.vendorAnalytics.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        vendor: true,
      },
      orderBy: {
        reportDate: "desc",
      },
    });
  }

  async getDriverAnalytics(
    from?: Date,
    to?: Date,
    driverId?: string
  ) {
    return prisma.driverAnalytics.findMany({
      where: {
        ...(driverId ? { driverId } : {}),
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        driver: true,
      },
      orderBy: {
        reportDate: "desc",
      },
    });
  }

  async getVehicleAnalytics(
    from?: Date,
    to?: Date,
    vehicleId?: string
  ) {
    return prisma.vehicleAnalytics.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(from || to
          ? {
              reportDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        vehicle: true,
      },
      orderBy: {
        reportDate: "desc",
      },
    });
  }

  async getAnalyticsEvents(
    from?: Date,
    to?: Date,
    city?: string
  ) {
    return prisma.analyticsEvent.findMany({
      where: {
        ...(city ? { city } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getCustomerCount() {
    return prisma.customer.count({
      where: {
        deletedAt: null,
      },
    });
  }

  async getActiveVendorCount() {
    return prisma.vendor.count({
      where: {
        deletedAt: null,
        isApproved: true,
      },
    });
  }

  async getActiveDriverCount() {
    return prisma.driver.count({
      where: {
        deletedAt: null,
      },
    });
  }

  async getVehicleCount() {
    return prisma.vehicle.count({
      where: {
        deletedAt: null,
      },
    });
  }
}

export const analyticsRepository =
  new AnalyticsRepository();