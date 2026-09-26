import { describe, expect, it } from "vitest";
import {
  calculateKPIs,
  calculateRevenueForecast,
  calculateConversionAnalytics,
} from "@/lib/services/analytics/BIAnalyticsService";

describe("P5.2 Analytics + BI", () => {
  it("calculates core KPIs", () => {
    const result = calculateKPIs({
      revenue: 100000,
      bookings: 100,
      completedBookings: 80,
      customers: 200,
      activeCustomers: 100,
    });

    expect(result.averageBookingValue).toBe(1000);
    expect(result.completionRate).toBe(80);
    expect(result.customerActivationRate).toBe(50);
  });

  it("generates deterministic revenue forecast", () => {
    expect(calculateRevenueForecast([100, 200, 300], 3)).toEqual([
      200, 200, 200,
    ]);
  });

  it("calculates CRM conversion analytics", () => {
    const result = calculateConversionAnalytics(100, 40, 20);

    expect(result.leadToOpportunityRate).toBe(40);
    expect(result.opportunityToConversionRate).toBe(50);
    expect(result.overallConversionRate).toBe(20);
  });

  it("handles zero denominators safely", () => {
    const result = calculateConversionAnalytics(0, 0, 0);

    expect(result.overallConversionRate).toBe(0);
    expect(result.leadToOpportunityRate).toBe(0);
    expect(result.opportunityToConversionRate).toBe(0);
  });

  it("handles empty forecast history safely", () => {
    expect(calculateRevenueForecast([], 2)).toEqual([0, 0]);
  });
});