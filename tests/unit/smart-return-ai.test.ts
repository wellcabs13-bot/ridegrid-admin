import { describe, expect, it } from "vitest";
import { recommendSmartReturnPricing } from "../../lib/services/smart-return/SmartReturnAIService";

describe("P2.7 Smart Return AI", () => {
  it("generates a bounded pricing recommendation", () => {
    const result = recommendSmartReturnPricing({
      baseFare: 10000,
      vehicleRating: 4.7,
      vendorRating: 4.6,
      demandScore: 0.2,
    });

    expect(result.recommendedDiscountPercent).toBeGreaterThanOrEqual(10);
    expect(result.recommendedDiscountPercent).toBeLessThanOrEqual(25);
    expect(result.recommendedFare).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.55);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("keeps baseline pricing deterministic", () => {
    const result = recommendSmartReturnPricing({
      baseFare: 10000,
    });

    expect(result.recommendedDiscountPercent).toBe(15);
    expect(result.recommendedFare).toBe(8500);
  });
});