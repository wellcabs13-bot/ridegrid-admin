import type { Booking } from "../types";
export function activeLocation(b: Booking) {
  return !!b.trip && ((b.status === "DRIVER_ASSIGNED" && b.trip.status === "ARRIVED_AT_PICKUP") || (b.status === "TRIP_STARTED" && ["STARTED", "PASSENGER_ONBOARD"].includes(b.trip.status)));
}
export function tripStatus(b: Booking) { return ["CANCELLED", "TRIP_COMPLETED"].includes(b.status) ? b.status : b.trip?.status || b.status; }
export function navigationUrl(address: string) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`; }
export function shareText(b: Booking) { return `RideGrid ${b.bookingNumber}\n${b.pickupLocation} → ${b.dropLocation}\n${b.pickupDateTime}\nVehicle: ${b.vehicle.registrationNumber}\nStatus: ${tripStatus(b)}`; }
