import { LIVE_BOOKING_STATUSES } from "@/lib/services/booking/BookingContactPolicy";

// Legacy /api/vendors/* responses are built from full records. Before they leave the
// server, identity numbers and RideGrid's internal splits are removed and bank
// account numbers are masked. The vendor apps use the allowlisted mobile adapter.
const DROP = new Set([
  "aadhaarNumber", "panNumber", "password", "passwordHash", "gatewayResponse",
  "platformCommission", "driverPayout", "vendorPayout", "processingCost", "rideGridRevenue",
]);

export function vendorSafe<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => vendorSafe(v)) as T;
  // Dates and Prisma Decimals serialise themselves; leave them intact.
  if (!value || typeof value !== "object" || typeof (value as { toJSON?: unknown }).toJSON === "function") return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (DROP.has(key)) continue;
    out[key] = key === "accountNumber" && typeof v === "string" ? `••••${v.slice(-4)}` : vendorSafe(v);
  }
  return out as T;
}

// Passenger contact is shared with the vendor only while the assignment is live.
export function vendorSafeBooking<T extends { status: string; customer?: { user?: Record<string, unknown> | null } | null }>(b: T): T {
  const safe = vendorSafe(b);
  if (!LIVE_BOOKING_STATUSES.has(b.status) && safe.customer?.user) {
    const { email: _email, mobile: _mobile, ...user } = safe.customer.user;
    return { ...safe, customer: { ...safe.customer, user } };
  }
  return safe;
}
