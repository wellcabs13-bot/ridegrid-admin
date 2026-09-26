import {
  analyticsRepository,
} from "@/lib/repositories/analytics";

export interface AnalyticsFilters {
  from?: Date;
  to?: Date;
  city?: string;
  vendorId?: string;
  driverId?: string;
  vehicleId?: string;
}

export class AnalyticsService {
  async getDashboard(
    filters: AnalyticsFilters = {}
  ) {
    const [
      dailyReports,
      revenueSummaries,
      vendorPerformance,
      driverPerformance,
      vehiclePerformance,
      bookingAnalytics,
      vendorAnalytics,
      driverAnalytics,
      vehicleAnalytics,
      events,
      customers,
      vendors,
      drivers,
      vehicles,
    ] = await Promise.all([
      analyticsRepository.getDailyReports(
        filters.from,
        filters.to
      ),

      analyticsRepository.getRevenueSummaries(
        filters.from,
        filters.to,
        filters.vendorId
      ),

      analyticsRepository.getVendorPerformance(
        filters.from,
        filters.to,
        filters.vendorId
      ),

      analyticsRepository.getDriverPerformance(
        filters.from,
        filters.to,
        filters.driverId
      ),

      analyticsRepository.getVehiclePerformance(
        filters.from,
        filters.to,
        filters.vehicleId
      ),

      analyticsRepository.getBookingAnalytics(
        filters.from,
        filters.to
      ),

      analyticsRepository.getVendorAnalytics(
        filters.from,
        filters.to,
        filters.vendorId
      ),

      analyticsRepository.getDriverAnalytics(
        filters.from,
        filters.to,
        filters.driverId
      ),

      analyticsRepository.getVehicleAnalytics(
        filters.from,
        filters.to,
        filters.vehicleId
      ),

      analyticsRepository.getAnalyticsEvents(
        filters.from,
        filters.to,
        filters.city
      ),

      analyticsRepository.getCustomerCount(),

      analyticsRepository.getActiveVendorCount(),

      analyticsRepository.getActiveDriverCount(),

      analyticsRepository.getVehicleCount(),
    ]);

    const totalBookings =
      dailyReports.reduce(
        (sum, item) =>
          sum + item.totalBookings,
        0
      );

    const completedTrips =
      dailyReports.reduce(
        (sum, item) =>
          sum + item.completedTrips,
        0
      );

    const cancelledTrips =
      dailyReports.reduce(
        (sum, item) =>
          sum + item.cancelledTrips,
        0
      );

    const totalRevenue =
      dailyReports.reduce(
        (sum, item) =>
          sum + Number(item.totalRevenue),
        0
      );

    const totalCommission =
      revenueSummaries.reduce(
        (sum, item) =>
          sum + Number(item.totalCommission),
        0
      );

    const netRevenue =
      revenueSummaries.reduce(
        (sum, item) =>
          sum + Number(item.netRevenue),
        0
      );

    const cancellationRate =
      totalBookings > 0
        ? (cancelledTrips / totalBookings) * 100
        : 0;

    const completionRate =
      totalBookings > 0
        ? (completedTrips / totalBookings) * 100
        : 0;

    const averageBookingValue =
      bookingAnalytics.length > 0
        ? bookingAnalytics.reduce(
            (sum, item) =>
              sum + Number(item.bookingValue),
            0
          ) / bookingAnalytics.length
        : 0;

    const averageVendorRating =
      vendorAnalytics.length > 0
        ? vendorAnalytics.reduce(
            (sum, item) =>
              sum + item.averageRating,
            0
          ) / vendorAnalytics.length
        : 0;

    const averageDriverRating =
      driverAnalytics.length > 0
        ? driverAnalytics.reduce(
            (sum, item) =>
              sum + item.averageRating,
            0
          ) / driverAnalytics.length
        : 0;

    const averageFleetUtilization =
      vehicleAnalytics.length > 0
        ? vehicleAnalytics.reduce(
            (sum, item) =>
              sum +
              Number(
                item.utilizationPercent ?? 0
              ),
            0
          ) / vehicleAnalytics.length
        : 0;

    const cityPerformance = this.buildCityPerformance(
      events
    );

    return {
      summary: {
        totalRevenue,
        totalCommission,
        netRevenue,
        totalBookings,
        completedTrips,
        cancelledTrips,
        cancellationRate,
        completionRate,
        averageBookingValue,
        customers,
        activeVendors: vendors,
        activeDrivers: drivers,
        totalVehicles: vehicles,
        averageVendorRating,
        averageDriverRating,
        fleetUtilization:
          averageFleetUtilization,
      },

      revenue: revenueSummaries,

      bookings: {
        total: totalBookings,
        completed: completedTrips,
        cancelled: cancelledTrips,
        completionRate,
        cancellationRate,
      },

      customers: {
        total: customers,
        bookingAnalytics,
      },

      vendors: vendorAnalytics,

      drivers: driverAnalytics,

      vehicles: vehicleAnalytics,

      vendorPerformance,

      driverPerformance,

      vehiclePerformance,

      cities: cityPerformance,

      events,
    };
  }

  async getMarketplaceAnalytics(
    filters: AnalyticsFilters = {}
  ) {
    const rows =
      await analyticsRepository.getMarketplaceAnalytics(
        filters.from,
        filters.to
      );

    const totalBookings = rows.reduce(
      (sum, item) => sum + item._count._all,
      0
    );

    const totalRevenue = rows.reduce(
      (sum, item) =>
        sum + Number(item._sum.finalFare ?? item._sum.estimatedFare ?? 0),
      0
    );

    const totalCommission = rows.reduce(
      (sum, item) =>
        sum + Number(item._sum.platformCommission ?? 0),
      0
    );

    return {
      totalBookings,
      totalRevenue,
      totalCommission,
      byStatus: rows,
    };
  }

  async getFinanceAnalytics(
    filters: AnalyticsFilters = {}
  ) {
    return analyticsRepository.getFinanceAnalytics(
      filters.from,
      filters.to
    );
  }

  async getCorporateAnalytics(
    filters: AnalyticsFilters = {},
    corporateId?: string
  ) {
    return analyticsRepository.getCorporateAnalytics(
      filters.from,
      filters.to,
      corporateId
    );
  }

  async getPredictiveInsights(
    filters: AnalyticsFilters = {}
  ) {
    const predictions =
      await analyticsRepository.getPredictiveInsights(
        filters.city,
        filters.from,
        filters.to
      );

    return {
      count: predictions.length,
      predictions,
    };
  }
  private buildCityPerformance(
    events: Array<{
      city: string | null;
    }>
  ) {
    const cityMap = new Map<
      string,
      number
    >();

    for (const event of events) {
      if (!event.city) continue;

      cityMap.set(
        event.city,
        (cityMap.get(event.city) ?? 0) + 1
      );
    }

    return Array.from(cityMap.entries())
      .map(([city, eventsCount]) => ({
        city,
        events: eventsCount,
      }))
      .sort(
        (a, b) =>
          b.events - a.events
      );
  }
}

export const analyticsService =
  new AnalyticsService();