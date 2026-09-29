export interface PricingOption { id: string; pricingType: string; tripType: string; vehicleCategory: string; packageName: string; city: string | null; fromCity: string | null; toCity: string | null; airportName: string | null; transferDirection: string | null; includedKm: number | null }
export interface SearchContext { city?: string; destination?: string; destinations?: string[]; service?: string; category?: string; pageId?: string; pageType?: string }
/** Adapt the central rate-version contract; never synthesize inventory or prices. */
export function normalizePricingOptions(rows: unknown[]): PricingOption[] {
  return rows.flatMap(value => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const text = (key: string) => typeof row[key] === "string" ? row[key] as string : "";
    const service = text("service");
    if (!["ONE_WAY", "ROUNDTRIP", "LOCAL"].includes(service)) return [];
    if (!text("rateId") || !text("vehicleCategory")) return [];
    return [{ id: text("rateId"), pricingType: service === "LOCAL" ? "LOCAL" : "OUTSTATION", tripType: service === "ONE_WAY" ? "ONEWAY" : service === "ROUNDTRIP" ? "ROUNDTRIP" : "",
      vehicleCategory: text("vehicleCategory"), packageName: text("packageName"), city: text("city"), fromCity: text("fromCity"), toCity: text("toCity"), airportName: null, transferDirection: null, includedKm: typeof row.includedKm === "number" ? row.includedKm : null }];
  });
}
export function locationKey(value: string) {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = { "chhatrapati sambhajinagar (aurangabad)": "aurangabad", "chhatrapati sambhajinagar": "aurangabad", sambhajinagar: "aurangabad", nasik: "nashik", bombay: "mumbai", osmanabad: "dharashiv", gulbarga: "kalaburagi", bijapur: "vijayapura", belgaum: "belagavi", bangalore: "bengaluru" };
  return aliases[normalized] || normalized;
}
export function categoryKey(value: string) {
  const key = value.trim().toLowerCase().replace(/[_ -]+/g, "");
  return ({ premiumsedan: "sedan", premiumsuv: "suv", royalsuv: "suv", luxurycars: "luxury" } as Record<string, string>)[key] || key;
}
/** Search intent is not a rate or a promise of supply. The listing service quotes real cars. */
export function marketplaceIntentHref(context: SearchContext, date: string, time: string, endDate = "") {
  const local = context.service === "LOCAL", round = context.service === "ROUNDTRIP";
  const params = new URLSearchParams({ serviceType: local ? "LOCAL" : "OUTSTATION", pickupCity: context.city || "", date, time });
  if (local) params.set("city", context.city || "");
  else { params.set("tripType", round ? "ROUNDTRIP" : "ONEWAY"); params.set("dropCity", context.destination || ""); }
  if (context.category) params.set("category", categoryKey(context.category).toUpperCase());
  if (round) {
    const start = Date.parse(`${date}T00:00:00Z`), end = Date.parse(`${endDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error("Choose a valid return date.");
    params.set("endDate", endDate); params.set("days", String(Math.round((end - start) / 86400000) + 1));
  }
  return `/marketplace/results?${params}`;
}
export const JOURNEYS = [
  { label: "Outstation", service: "OUTSTATION", trip: "ONEWAY" },
  { label: "Round Trip", service: "OUTSTATION", trip: "ROUNDTRIP" },
  { label: "Local", service: "LOCAL", trip: "" },
  { label: "Airport", service: "AIRPORT", trip: "" },
] as const;
/** Airport search intent for the central listing service; no fare or supply is implied. */
export function airportIntentHref(input: { city: string; direction: "PICKUP" | "DROP"; airport?: string; passengers?: number }, date: string, time: string) {
  const params = new URLSearchParams({ serviceType: "AIRPORT", pickupCity: input.city, city: input.city, airportDirection: input.direction, date, time });
  if (input.airport) params.set("airport", input.airport);
  if (input.passengers && input.passengers > 1) params.set("passengers", String(input.passengers));
  return `/marketplace/results?${params}`;
}
/** Adds the party size so results show only vehicles with enough seats. */
export function withPassengers(href: string, passengers: number) {
  if (!Number.isInteger(passengers) || passengers <= 1) return href;
  const url = new URL(href, "https://www.wellcabs.com");
  url.searchParams.set("passengers", String(passengers));
  return `${url.pathname}?${url.searchParams}`;
}
export function journeyOptions(options: PricingOption[], journey: number) {
  const j = JOURNEYS[journey];
  return j ? options.filter(o => o.pricingType === j.service && (j.service !== "OUTSTATION" || o.tripType === j.trip)) : [];
}
export function marketplaceResultsHref(option: PricingOption, date: string, time: string, category = "", endDate = "") {
  const params = new URLSearchParams({ serviceType: option.pricingType, tripType: option.pricingType === "OUTSTATION" ? option.tripType : "",
    pickupCity: option.pricingType === "OUTSTATION" ? option.fromCity || "" : option.city || "", date, time });
  if (option.pricingType === "OUTSTATION") params.set("dropCity", option.toCity || "");
  else if (option.pricingType === "AIRPORT") {
    params.set("airport", option.airportName || ""); params.set("airportDirection", option.transferDirection || ""); params.set("airportSlab", option.includedKm === null ? "" : String(option.includedKm));
  } else params.set("packageName", option.packageName);
  if (category) params.set("category", category);
  if (option.pricingType === "LOCAL") params.set("city", option.city || "");
  if (option.tripType === "ROUNDTRIP") {
    const start = Date.parse(`${date}T00:00:00Z`), end = Date.parse(`${endDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error("Choose a valid return date.");
    params.set("endDate", endDate); params.set("days", String(Math.round((end - start) / 86400000) + 1));
  }
  return `/marketplace/results?${params}`;
}
export function displayPrice(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
