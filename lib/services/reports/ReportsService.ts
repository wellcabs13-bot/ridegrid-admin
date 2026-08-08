import {
  reportsRepository,
  ReportDateFilter,
} from "@/lib/repositories/reports";

export interface ReportsFilters
  extends ReportDateFilter {
  vendorId?: string;
  driverId?: string;
  vehicleId?: string;
  corporateId?: string;
}

export class ReportsService {
  async getDashboard(
    filters: ReportsFilters = {}
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
      bookingAnalytics,
      reportCounts,
    ] = await Promise.all([
      reportsRepository.getDailyReports(filters),

      reportsRepository.getRevenueSummaries(
        filters,
        filters.vendorId
      ),

      reportsRepository.getExpenseSummaries(
        filters
      ),

      reportsRepository.getGSTSummaries(
        filters
      ),

      reportsRepository.getVendorPerformance(
        filters,
        filters.vendorId
      ),

      reportsRepository.getDriverPerformance(
        filters,
        filters.driverId
      ),

      reportsRepository.getVehiclePerformance(
        filters,
        filters.vehicleId
      ),

      reportsRepository.getCorporateReports(
        filters,
        filters.corporateId
      ),

      reportsRepository.getBookingAnalytics(
        filters
      ),

      reportsRepository.getReportCounts(
        filters
      ),
    ]);

    const totalRevenue =
      dailyReports.reduce(
        (sum, report) =>
          sum + Number(report.totalRevenue),
        0
      );

    const totalBookings =
      dailyReports.reduce(
        (sum, report) =>
          sum + report.totalBookings,
        0
      );

    const completedTrips =
      dailyReports.reduce(
        (sum, report) =>
          sum + report.completedTrips,
        0
      );

    const cancelledTrips =
      dailyReports.reduce(
        (sum, report) =>
          sum + report.cancelledTrips,
        0
      );

    const totalExpenses =
      expenseReports.reduce(
        (sum, report) =>
          sum + Number(report.totalExpense),
        0
      );

    const totalCommission =
      revenueReports.reduce(
        (sum, report) =>
          sum + Number(report.totalCommission),
        0
      );

    const netRevenue =
      revenueReports.reduce(
        (sum, report) =>
          sum + Number(report.netRevenue),
        0
      );

    const gstCollected =
      gstReports.reduce(
        (sum, report) =>
          sum + Number(report.gstCollected),
        0
      );

    const taxableAmount =
      gstReports.reduce(
        (sum, report) =>
          sum + Number(report.taxableAmount),
        0
      );

    const averageBookingValue =
      bookingAnalytics.length > 0
        ? bookingAnalytics.reduce(
            (sum, item) =>
              sum + Number(item.bookingValue),
            0
          ) / bookingAnalytics.length
        : 0;

    const completionRate =
      totalBookings > 0
        ? (completedTrips / totalBookings) * 100
        : 0;

    const cancellationRate =
      totalBookings > 0
        ? (cancelledTrips / totalBookings) * 100
        : 0;

    return {
      summary: {
        totalReports:
          Object.values(reportCounts).reduce(
            (sum, value) => sum + value,
            0
          ),

        totalRevenue,

        totalExpenses,

        totalCommission,

        netRevenue,

        taxableAmount,

        gstCollected,

        totalBookings,

        completedTrips,

        cancelledTrips,

        completionRate,

        cancellationRate,

        averageBookingValue,
      },

      dailyReports,

      revenueReports,

      expenseReports,

      gstReports,

      vendorReports,

      driverReports,

      vehicleReports,

      corporateReports,

      bookingAnalytics,

      reportCounts,
    };
  }

  async getRevenueReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getRevenueSummaries(
      filters,
      filters.vendorId
    );
  }

  async getBookingReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getDailyReports(
      filters
    );
  }

  async getVendorReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getVendorPerformance(
      filters,
      filters.vendorId
    );
  }

  async getDriverReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getDriverPerformance(
      filters,
      filters.driverId
    );
  }

  async getVehicleReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getVehiclePerformance(
      filters,
      filters.vehicleId
    );
  }

  async getFinanceReport(
    filters: ReportsFilters = {}
  ) {
    const [
      revenue,
      expenses,
    ] = await Promise.all([
      reportsRepository.getRevenueSummaries(
        filters,
        filters.vendorId
      ),

      reportsRepository.getExpenseSummaries(
        filters
      ),
    ]);

    return {
      revenue,
      expenses,
    };
  }

  async getGSTReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getGSTSummaries(
      filters
    );
  }

  async getCorporateReport(
    filters: ReportsFilters = {}
  ) {
    return reportsRepository.getCorporateReports(
      filters,
      filters.corporateId
    );
  }
}

export const reportsService =
  new ReportsService();