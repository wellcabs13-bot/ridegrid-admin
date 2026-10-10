export type Tone = "red" | "green" | "blue" | "amber" | "grey";

// Display words for server status codes. Unknown codes are humanised, never hidden.
const LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  UPCOMING: "Upcoming",
  DRIVER_ASSIGNED: "Driver assigned",
  TRIP_STARTED: "Ongoing",
  TRIP_COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ASSIGNED: "Assigned",
  ARRIVED_AT_PICKUP: "At pickup",
  STARTED: "Ongoing",
  PASSENGER_ONBOARD: "Ongoing",
  COMPLETED: "Completed",
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  ON_TRIP: "On trip",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  VERIFIED: "Verified",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  EXPIRING_SOON: "Expiring soon",
  VERIFICATION_PENDING: "Verification pending",
  PENDING_VERIFICATION: "Verification pending",
  LISTED: "Listed",
  NOT_LISTED: "Not listed",
  UNAVAILABLE: "Unavailable",
};
export function statusLabel(value: string) {
  if (LABELS[value]) return LABELS[value];
  const words = value.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export function statusTone(value: string): Tone {
  if (/CANCEL|REJECT|EXPIRED|SUSPEND|BLOCK|FAIL/.test(value)) return "red";
  if (/PENDING|MAINTENANCE|RESERV|EXPIRING|NOT_LISTED|TRIP_STARTED|^STARTED|ONBOARD|ARRIVED|PROCESS/.test(value)) return "amber";
  if (/COMPLETED|ON_TRIP|ASSIGNED|UPCOMING/.test(value)) return "blue";
  if (/AVAILABLE|ACTIVE|APPROVED|SETTLED|VERIFIED|LISTED|CONFIRMED|PAID|SUCCESS/.test(value) && !/UNAVAILABLE|INACTIVE/.test(value)) return "green";
  return "grey";
}
// The status a booking card shows: the live trip state while it is running.
export function bookingStatus(b: { status: string; trip: { status: string } | null }) {
  return ["CANCELLED", "TRIP_COMPLETED"].includes(b.status) ? b.status : b.trip?.status || b.status;
}
// Expired / due within 30 days, from the document's recorded expiry only.
export function documentAlert(d: { expiryDate: string | null }, now = Date.now()) {
  if (!d.expiryDate) return null;
  const t = new Date(d.expiryDate).getTime();
  if (!Number.isFinite(t)) return null;
  return t < now ? "EXPIRED" : t < now + 30 * 86400000 ? "EXPIRING_SOON" : null;
}
