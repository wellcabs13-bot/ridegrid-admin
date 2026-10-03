import { describe, expect, it } from "vitest";
import { TripType } from "@prisma/client";
import {
  evaluateSmartReturnEligibility,
} from "../../lib/services/smart-return/SmartReturnEligibilityService";

const base = {
  tripId: "trip-1",
  bookingId: "booking-1",
  bookingNumber: "RG-0001",
  pickupLocation: "Pune",
  dropLocation: "Mumbai",
  tripCompletedAt: new Date(),
  vendorId: "vendor-1",
  vehicleId: "vehicle-1",
};

describe("P2.1 Smart Return Eligibility", () => {
  it("accepts completed Outstation One Way trips", () => {
    const result = evaluateSmartReturnEligibility({
      ...base,
      tripType: TripType.ONEWAY,
    });

    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects non-one-way trips", () => {
    const result = evaluateSmartReturnEligibility({
      ...base,
      tripType: TripType.ROUND_TRIP,
    });

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(
      "Trip is not an Outstation One Way booking."
    );
  });

  it("rejects incomplete candidates", () => {
    const result = evaluateSmartReturnEligibility({
      ...base,
      tripType: TripType.ONEWAY,
      tripCompletedAt: null,
      pickupLocation: "",
      dropLocation: "",
    });

    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});