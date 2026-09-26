import type { Approval, Decision, Listing, Quote, RouteDraft, Search } from "../types";

function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use a date in YYYY-MM-DD format.");
  const n = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== value) throw new Error("Enter a valid date.");
  return n;
}
export function calendarDays(start: string, end: string) {
  const n = (day(end) - day(start)) / 86400000 + 1;
  if (n < 1 || n > 365) throw new Error("Choose a return date within 365 days of departure.");
  return n;
}
// Trip fields are calendar values in India time, whatever the device time zone.
export function pickupISO(search: Pick<Search, "date" | "time">) {
  day(search.date);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(search.time)) throw new Error("Enter a valid 24-hour pickup time.");
  return new Date(`${search.date}T${search.time}:00+05:30`).toISOString();
}
export const queryString = (value: Record<string, string>) => new URLSearchParams(value).toString();

export function quoteInput(search: Search, listing: Pick<Listing, "pricing">, key: string) {
  return {
    pricingPackageId: listing.pricing.pricingPackageId,
    at: pickupISO(search),
    idempotencyKey: key,
    ...(search.tripType === "ROUNDTRIP" ? { days: search.days } : {}),
  };
}
export function quoteExpired(quote: Pick<Quote, "fare">, now = Date.now()) {
  const expiry = Date.parse(quote.fare.quoteExpiry || "");
  return !Number.isFinite(expiry) || expiry <= now;
}
// Booking and approval payloads carry only trip details. Company and employee
// identity are resolved by the server from the signed-in session.
export function rideInput(search: Search, listing: Pick<Listing, "id" | "pricing">, quote: Quote, pickupAddress: string, dropAddress: string) {
  if (quoteExpired(quote)) throw new Error("Your quote expired. Refresh your price.");
  if (quote.fare.tripDateTime !== pickupISO(search) || (search.tripType === "ROUNDTRIP" && quote.fare.days !== search.days))
    throw new Error("Trip details changed. Refresh your quote.");
  if (!pickupAddress.trim() || !dropAddress.trim()) throw new Error("Enter pickup and drop addresses.");
  return {
    quoteId: quote.id, listingId: listing.id, pricingPackageId: listing.pricing.pricingPackageId,
    pickupDateTime: pickupISO(search), pickupAddress: pickupAddress.trim(), dropAddress: dropAddress.trim(),
  };
}
// An approved ride is booked only with a fresh quote for exactly the approved package and time.
export function approvedRideInput(approval: Approval, quote: Quote) {
  const ride = approval.ride;
  if (!ride || approval.status !== "APPROVED") throw new Error("This approval is not available for booking.");
  if (quoteExpired(quote)) throw new Error("Your quote expired. Refresh your price.");
  if (quote.fare.tripDateTime !== ride.pickupDateTime) throw new Error("Trip details changed. Submit a new request.");
  if (approval.amount && Number(quote.fare.finalPayable) > Number(approval.amount))
    throw new Error("The current fare is higher than the approved amount. Submit a new request.");
  return {
    quoteId: quote.id, listingId: ride.listingId, pricingPackageId: ride.pricingPackageId, pickupDateTime: ride.pickupDateTime,
    pickupAddress: ride.pickupAddress, dropAddress: ride.dropAddress, approvalId: approval.id,
  };
}
export function approvalQuoteInput(approval: Approval, key: string) {
  const ride = approval.ride!;
  return { pricingPackageId: ride.pricingPackageId, at: ride.pickupDateTime, idempotencyKey: key, ...(ride.tripType === "ROUNDTRIP" ? { days: ride.days } : {}) };
}
export function rebookParams(draft: RouteDraft) {
  return {
    serviceType: draft.serviceType, tripType: draft.tripType, pickupCity: draft.pickupCity, dropCity: draft.dropCity,
    category: draft.category, packageName: draft.packageName,
  };
}
export const decisionLabel = (d: Decision) => (d === "ALLOWED" ? "Within policy" : d === "APPROVAL_REQUIRED" ? "Approval required" : "Not allowed");
const ACRONYMS = new Set(["SUV", "MUV", "GST", "CNG", "UPI"]);
export const label = (s: string) =>
  s.replaceAll("_", " ").split(" ").map((w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ");
export const serviceLabel = (s: string) => (s === "ONE_WAY" ? "One-way" : s === "ROUNDTRIP" ? "Roundtrip" : s === "LOCAL" ? "Local" : label(s));
export const money = (v: string | number | null | undefined) =>
  v == null || v === "" ? "Not available" : `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const dateTime = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " IST"
    : "Not recorded";
export function tripGroup(status: string) {
  return status === "CANCELLED" ? "CANCELLED" : status === "TRIP_COMPLETED" ? "COMPLETED" : status === "TRIP_STARTED" ? "ACTIVE" : "UPCOMING";
}
