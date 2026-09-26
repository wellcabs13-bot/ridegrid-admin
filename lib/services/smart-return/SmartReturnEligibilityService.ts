import { TripType } from "@prisma/client";

export interface SmartReturnCandidate {
  tripId: string;
  bookingId: string;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  tripType: TripType | string;
  tripCompletedAt: Date | null;
  vendorId: string;
  vehicleId: string;
}

export interface SmartReturnEligibility {
  eligible: boolean;
  reasons: string[];
}

export function evaluateSmartReturnEligibility(
  candidate: SmartReturnCandidate
): SmartReturnEligibility {
  const reasons: string[] = [];

  if (candidate.tripType !== TripType.ONEWAY) {
    reasons.push("Trip is not an Outstation One Way booking.");
  }

  if (!candidate.tripCompletedAt) {
    reasons.push("Trip completion time is missing.");
  }

  if (!candidate.pickupLocation?.trim()) {
    reasons.push("Original pickup location is missing.");
  }

  if (!candidate.dropLocation?.trim()) {
    reasons.push("Original drop location is missing.");
  }

  if (!candidate.vendorId) {
    reasons.push("Vendor is missing.");
  }

  if (!candidate.vehicleId) {
    reasons.push("Vehicle is missing.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}