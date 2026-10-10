import type { RouteDraft, Booking } from "../types";
export function routeParams(route: RouteDraft) {
  // Intentionally omit departure dates, quote IDs, prices and exact addresses.
  return {
    serviceType: route.serviceType,
    tripType: route.tripType,
    pickupCity: route.pickupCity,
    dropCity: route.dropCity,
    category: route.category,
    packageName: route.packageName,
    fresh: "1",
  };
}
export function shareSummary(b: Booking) {
  // No access token, contact numbers, customer details, quote or payment data.
  return `RideGrid journey\n${b.pickupLocation} → ${b.dropLocation}\n${new Date(b.pickupDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST\n${b.vehicle.make} ${b.vehicle.model} · ${b.vehicle.registrationNumber}\nStatus: ${b.status.replaceAll("_", " ")}\nShared by the traveller.`;
}
