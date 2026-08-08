import { prisma } from "@/lib/prisma";

export interface ReportDateFilter {
  from?: Date;
  to?: Date;
}

export class ReportsRepository {
  async getDailyReports(
    filter: ReportDateFilter = {}
  ) {
    return prisma.dailyReport.findMany({
      where: {
        ...(filter.from || filter.to
          ? {
              reportDate: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
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
    filter: ReportDateFilter = {},
    vendorId?: string
  ) {
    return prisma.revenueSummary.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(filter.from || filter.to
          ? {
              periodStart: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
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

  async getExpenseSummaries(
    filter: ReportDateFilter = {}
  ) {
    return prisma.expenseSummary.findMany({
      where: {
        ...(filter.from || filter.to
          ? {
              periodStart: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: {
        periodStart: "asc",
      },
    });
  }

  async getGSTSummaries(
    filter: ReportDateFilter = {}
  ) {
    return prisma.gSTSummary.findMany({
      where: {
        ...(filter.from || filter.to
          ? {
              periodStart: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: {
        periodStart: "asc",
      },
    });
  }

  async getVendorPerformance(
    filter: ReportDateFilter = {},
    vendorId?: string
  ) {
    return prisma.vendorPerformance.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(filter.from || filter.to
          ? {
              reportDate: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
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
    filter: ReportDateFilter = {},
    driverId?: string
  ) {
    return prisma.driverPerformance.findMany({
      where: {
        ...(driverId ? { driverId } : {}),
        ...(filter.from || filter.to
          ? {
              reportDate: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
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
    filter: ReportDateFilter = {},
    vehicleId?: string
  ) {
    return prisma.vehiclePerformance.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(filter.from || filter.to
          ? {
              reportDate: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
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

  async getCorporateReports(
    filter: ReportDateFilter = {},
    corporateId?: string
  ) {
    return prisma.corporateReport.findMany({
      where: {
        ...(corporateId ? { corporateId } : {}),
        ...(filter.from || filter.to
          ? {
              periodStart: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
              },
            }
          : {}),
      },
      include: {
        corporate: true,
      },
      orderBy: {
        periodStart: "desc",
      },
    });
  }

  async getBookingAnalytics(
    filter: ReportDateFilter = {}
  ) {
    return prisma.bookingAnalytics.findMany({
      where: {
        ...(filter.from || filter.to
          ? {
              createdAt: {
                ...(filter.from
                  ? { gte: filter.from }
                  : {}),
                ...(filter.to
                  ? { lte: filter.to }
                  : {}),
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

  async getReportCounts(
    filter: ReportDateFilter = {}
  ) {
    const [
      dailyReports,
      revenueReports,
      expenseReports,
      gstReports,
      vendorReports,
      driverReports,
      vehicleReports,
      corporateReports,
    ] = await Promise.all([
      prisma.dailyReport.count({
        where: {
          ...(filter.from || filter.to
            ? {
                reportDate: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.revenueSummary.count({
        where: {
          ...(filter.from || filter.to
            ? {
                periodStart: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.expenseSummary.count({
        where: {
          ...(filter.from || filter.to
            ? {
                periodStart: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.gSTSummary.count({
        where: {
          ...(filter.from || filter.to
            ? {
                periodStart: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.vendorPerformance.count({
        where: {
          ...(filter.from || filter.to
            ? {
                reportDate: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.driverPerformance.count({
        where: {
          ...(filter.from || filter.to
            ? {
                reportDate: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.vehiclePerformance.count({
        where: {
          ...(filter.from || filter.to
            ? {
                reportDate: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),

      prisma.corporateReport.count({
        where: {
          ...(filter.from || filter.to
            ? {
                periodStart: {
                  ...(filter.from
                    ? { gte: filter.from }
                    : {}),
                  ...(filter.to
                    ? { lte: filter.to }
                    : {}),
                },
              }
            : {}),
        },
      }),
    ]);

    return {
      dailyReports,
      revenueReports,
      expenseReports,
      gstReports,
      vendorReports,
      driverReports,
      vehicleReports,
      corporateReports,
    };
  }
}

export const reportsRepository =
  new ReportsRepository();