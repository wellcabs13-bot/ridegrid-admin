export interface SmartReturnAIInput {
  baseFare: number;
  distanceKm?: number;
  vehicleRating?: number;
  vendorRating?: number;
  demandScore?: number;
  timeToPickupHours?: number;
}

export interface SmartReturnAIResult {
  recommendedDiscountPercent: number;
  recommendedFare: number;
  confidence: number;
  reasons: string[];
}

export function recommendSmartReturnPricing(
  input: SmartReturnAIInput
): SmartReturnAIResult {
  const reasons: string[] = [];
  let discount = 15;

  if (input.demandScore !== undefined && input.demandScore < 0.35) {
    discount += 5;
    reasons.push("Low demand increases return-trip pricing incentive.");
  }

  if ((input.vehicleRating ?? 0) >= 4.5) {
    discount -= 2;
    reasons.push("High-rated vehicle supports stronger pricing.");
  }

  if ((input.vendorRating ?? 0) >= 4.5) {
    discount -= 2;
    reasons.push("High-rated vendor supports stronger pricing.");
  }

  discount = Math.min(25, Math.max(10, discount));

  const recommendedFare =
    Math.round(input.baseFare * (1 - discount / 100) * 100) / 100;

  const confidence = Math.min(
    0.95,
    Math.max(
      0.55,
      0.65 +
        (input.vehicleRating ?? 0) / 100 +
        (input.vendorRating ?? 0) / 100
    )
  );

  if (reasons.length === 0) {
    reasons.push("Baseline Smart Return pricing recommendation.");
  }

  return {
    recommendedDiscountPercent: discount,
    recommendedFare,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
  };
}