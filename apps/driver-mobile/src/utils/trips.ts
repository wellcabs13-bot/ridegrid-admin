import type { Booking } from "../types";
type TripState = Pick<Booking, "status" | "trip">;
export type Tone = "red" | "green" | "blue" | "amber" | "grey";
export function activeLocation(b: TripState) {
  return !!b.trip && ((b.status === "DRIVER_ASSIGNED" && b.trip.status === "ARRIVED_AT_PICKUP") || (b.status === "TRIP_STARTED" && ["STARTED", "PASSENGER_ONBOARD"].includes(b.trip.status)));
}
export function tripStatus(b: TripState) { return ["CANCELLED", "TRIP_COMPLETED"].includes(b.status) ? b.status : b.trip?.status || b.status; }
export function navigationUrl(address: string) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`; }
export function routeUrl(from: string, to: string) { return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`; }
export function shareText(b: Booking) { return `RideGrid ${b.bookingNumber}\n${b.pickupLocation} → ${b.dropLocation}\n${b.pickupDateTime}\nVehicle: ${b.vehicle.registrationNumber}\nStatus: ${tripStatus(b)}`; }

// Which screen a trip belongs on. "scheduled" is assigned to this driver but not yet
// dispatched (e.g. CONFIRMED): visible, with no lifecycle action available.
export type Phase = "scheduled" | "upcoming" | "arrived" | "inProgress" | "completed" | "cancelled";
export function tripPhase(b: TripState): Phase {
  if (b.status === "CANCELLED") return "cancelled";
  if (b.status === "TRIP_COMPLETED") return "completed";
  if (b.status === "TRIP_STARTED") return "inProgress";
  if (b.status === "DRIVER_ASSIGNED" && b.trip?.status === "ARRIVED_AT_PICKUP") return "arrived";
  if (b.status === "DRIVER_ASSIGNED" && (!b.trip || b.trip.status === "ASSIGNED")) return "upcoming";
  return "scheduled";
}

// The one server transition currently allowed — the same rules as the backend's
// nextDriverState. null means the driver cannot change this trip's state.
export type DriverAction = "ARRIVED" | "START" | "COMPLETE";
export function driverAction(b: TripState): DriverAction | null {
  const trip = b.trip?.status ?? null;
  if (b.status === "DRIVER_ASSIGNED" && (!trip || trip === "ASSIGNED")) return "ARRIVED";
  if (b.status === "DRIVER_ASSIGNED" && trip === "ARRIVED_AT_PICKUP") return "START";
  if (b.status === "TRIP_STARTED" && (trip === "STARTED" || trip === "PASSENGER_ONBOARD")) return "COMPLETE";
  return null;
}

export function statusInfo(b: TripState): { label: string; tone: Tone } {
  switch (tripPhase(b)) {
    case "cancelled": return { label: "Cancelled", tone: "red" };
    case "completed": return { label: "Completed", tone: "green" };
    case "inProgress": return { label: "In progress", tone: "amber" };
    case "arrived": return { label: "At pickup", tone: "amber" };
    case "upcoming": return { label: "Upcoming", tone: "blue" };
    default: return { label: b.status === "CONFIRMED" ? "Scheduled" : b.status.replaceAll("_", " ").toLowerCase(), tone: "grey" };
  }
}

// "in 25 min", "in 2 h 5 min", "15 min ago" — from real timestamps only.
export function relative(target: string | null | undefined, now = Date.now()) {
  const t = target ? new Date(target).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const mins = Math.round((t - now) / 60000), abs = Math.abs(mins);
  const text = abs < 1 ? "now" : abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}`;
  return abs < 1 ? "now" : mins > 0 ? `in ${text}` : `${text} ago`;
}
export function duration(from: string | null | undefined, to: string | null | undefined) {
  const a = from ? new Date(from).getTime() : NaN, b = to ? new Date(to).getTime() : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return "";
  const mins = Math.round((b - a) / 60000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
}
