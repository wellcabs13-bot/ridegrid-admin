export type KPIInput = {
  revenue: number;
  bookings: number;
  completedBookings: number;
  customers: number;
  activeCustomers: number;
};

export function calculateKPIs(input: KPIInput) {
  const completionRate =
    input.bookings > 0
      ? Math.round((input.completedBookings / input.bookings) * 10000) / 100
      : 0;

  const customerActivationRate =
    input.customers > 0
      ? Math.round((input.activeCustomers / input.customers) * 10000) / 100
      : 0;

  const averageBookingValue =
    input.bookings > 0
      ? Math.round((input.revenue / input.bookings) * 100) / 100
      : 0;

  return {
    revenue: input.revenue,
    bookings: input.bookings,
    completedBookings: input.completedBookings,
    completionRate,
    customerActivationRate,
    averageBookingValue,
  };
}

export function calculateRevenueForecast(
  historicalRevenue: number[],
  periods = 3
) {
  if (periods < 1) throw new Error("Forecast periods must be positive.");

  const values = historicalRevenue.filter(
    (value) => Number.isFinite(value) && value >= 0
  );

  if (values.length === 0) {
    return Array.from({ length: periods }, () => 0);
  }

  const average =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return Array.from({ length: periods }, () =>
    Math.round(average * 100) / 100
  );
}

export function calculateConversionAnalytics(
  leads: number,
  opportunities: number,
  conversions: number
) {
  const safeRate = (value: number, base: number) =>
    base > 0 ? Math.round((value / base) * 10000) / 100 : 0;

  return {
    leads,
    opportunities,
    conversions,
    leadToOpportunityRate: safeRate(opportunities, leads),
    opportunityToConversionRate: safeRate(conversions, opportunities),
    overallConversionRate: safeRate(conversions, leads),
  };
}