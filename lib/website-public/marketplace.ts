export interface PricingOption { id: string; pricingType: string; tripType: string; vehicleCategory: string; packageName: string; city: string | null; fromCity: string | null; toCity: string | null; airportName: string | null; transferDirection: string | null; includedKm: number | null }
export const JOURNEYS = [
  { label: "One Way", service: "OUTSTATION", trip: "ONEWAY" },
  { label: "Round Trip", service: "OUTSTATION", trip: "ROUNDTRIP" },
  { label: "Airport", service: "AIRPORT", trip: "" },
  { label: "Local", service: "LOCAL", trip: "" },
  { label: "Rental", service: "RENTAL", trip: "" },
] as const;
export function journeyOptions(options: PricingOption[], journey: number) {
  const j = JOURNEYS[journey];
  return j ? options.filter(o => o.pricingType === j.service && (j.service !== "OUTSTATION" || o.tripType === j.trip)) : [];
}
export function marketplaceResultsHref(option: PricingOption, date: string, time: string, category = "") {
  const params = new URLSearchParams({ serviceType: option.pricingType, tripType: option.pricingType === "OUTSTATION" ? option.tripType : "",
    pickupCity: option.pricingType === "OUTSTATION" ? option.fromCity || "" : option.city || "", date, time });
  if (option.pricingType === "OUTSTATION") params.set("dropCity", option.toCity || "");
  else if (option.pricingType === "AIRPORT") {
    params.set("airport", option.airportName || ""); params.set("airportDirection", option.transferDirection || ""); params.set("airportSlab", option.includedKm === null ? "" : String(option.includedKm));
  } else params.set("packageName", option.packageName);
  if (category) params.set("category", category);
  return `/marketplace/results?${params}`;
}
export function displayPrice(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
