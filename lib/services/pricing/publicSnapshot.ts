// Customer-facing view of a pricing snapshot. The vendor payout, payment processing
// cost and RideGrid net revenue are internal splits: they stay on the stored quote
// and booking, and are only shown to authorised staff/vendors.
const INTERNAL_KEYS = ["vendorPayout", "processingCost", "rideGridRevenue"] as const;

export function publicSnapshot<T extends object>(snapshot: T): Omit<T, (typeof INTERNAL_KEYS)[number]> {
  const copy = { ...snapshot } as Record<string, unknown>;
  for (const key of INTERNAL_KEYS) delete copy[key];
  return copy as Omit<T, (typeof INTERNAL_KEYS)[number]>;
}
