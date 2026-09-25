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
    paymentMethod: "CASH",
  };
}
export function bookingGroup(status: string) {
  return status === "CANCELLED"
    ? "Cancelled"
    : status === "TRIP_COMPLETED"
      ? "Completed"
      : status === "TRIP_STARTED"
        ? "Active"
        : "Upcoming";
}
export const label = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const money = (value: string | number | null | undefined) =>
  value == null
    ? "Not available"
    : `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
