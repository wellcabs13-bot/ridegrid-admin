import type { Listing, Quote, Search } from "../types";
function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use a date in YYYY-MM-DD format.");
  const n = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== value)
    throw new Error("Enter a valid date.");
  return n;
}
export function calendarDays(start: string, end: string) {
  const n = (day(end) - day(start)) / 86400000 + 1;
  if (n < 1 || n > 365)
    throw new Error("Choose a return date within 365 days of departure.");
  return n;
}
export function pickupISO(search: Search) {
  day(search.date);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(search.time))
    throw new Error("Enter a valid 24-hour pickup time.");
  return new Date(`${search.date}T${search.time}:00+05:30`).toISOString();
}
export const queryString = (value: Record<string, string>) =>
  new URLSearchParams(value).toString();
export function quoteInput(search: Search, listing: Listing, key: string) {
  return {
    pricingPackageId: listing.pricing.pricingPackageId,
    at: pickupISO(search),
    idempotencyKey: key,
    ...(search.tripType === "ROUNDTRIP" ? { days: search.days } : {}),
  };
}
export function quoteExpired(quote: Quote, now = Date.now()) {
  return (
    !Number.isFinite(Date.parse(quote.snapshot.quoteExpiry)) ||
    Date.parse(quote.snapshot.quoteExpiry) <= now
  );
}
export function bookingInput(
  search: Search,
  listing: Listing,
  quote: Quote,
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
  },
  pickupAddress: string,
  dropAddress: string,
  paymentMethod: "UPI" = "UPI",
) {
  if (quoteExpired(quote))
    throw new Error("Your quote expired. Refresh your price before booking.");
  if (
    quote.snapshot.tripDateTime !== pickupISO(search) ||
    (search.tripType === "ROUNDTRIP" &&
      quote.snapshot.tripMetrics?.days !== search.days)
  )
    throw new Error("Trip details changed. Refresh your quote.");
  return {
    ...search,
    listingId: listing.id,
    pricingPackageId: listing.pricing.pricingPackageId,
    quoteId: quote.id,
    pickupDateTime: pickupISO(search),
    pickupAddress: pickupAddress.trim(),
    dropAddress: dropAddress.trim(),
    customer,
    paymentMethod,
    platform: "mobile",
  };
}
export const journeyLabel = (s: string) =>
  s === "ONE_WAY" ? "One-way" : s === "ROUNDTRIP" ? "Round trip" : s === "LOCAL" ? "Local" : s === "AIRPORT" ? "Airport" : label(s);
export function bookingGroup(status: string) {
  return status === "CANCELLED"
    ? "Cancelled"
    : status === "TRIP_COMPLETED"
      ? "Completed"
      : status === "TRIP_STARTED"
        ? "Active"
        : "Upcoming";
}
const ACRONYMS = new Set(["UPI", "SUV", "MUV", "GST", "CNG", "IST", "PAYU"]);
export const label = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w+/g, (w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
// Status as the customer should read it. Colour is never the only signal: the text says it.
export function bookingTone(status: string): { tone: "cyan" | "gold" | "green"; icon: "checkmark-circle-outline" | "time-outline" | "close-circle-outline" | "car-outline" } {
  if (status === "CANCELLED") return { tone: "cyan", icon: "close-circle-outline" };
  if (status === "PENDING" || status === "AWAITING_PAYMENT") return { tone: "gold", icon: "time-outline" };
  if (status === "TRIP_STARTED" || status === "DRIVER_ASSIGNED") return { tone: "green", icon: "car-outline" };
  return { tone: "green", icon: "checkmark-circle-outline" };
}
export const bookingStatusLabel = (status: string) =>
  status === "AWAITING_PAYMENT" ? "Awaiting payment" : status === "TRIP_STARTED" ? "Trip in progress" : status === "TRIP_COMPLETED" ? "Trip completed" : label(status);
export const money = (value: string | number | null | undefined) =>
  value == null
    ? "Not available"
    : `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
