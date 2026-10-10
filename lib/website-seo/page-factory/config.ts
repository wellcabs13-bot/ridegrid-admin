import type { WebsiteEntityType } from "../entities/types";

export const FACTORY_TYPES = [
  { type: "ROUTE", slug: "routes", label: "Routes", help: "Create public-site route entities and route page drafts.", fields: ["fromCity", "toCity"] },
  { type: "CITY", slug: "cities", label: "Cities", help: "Prepare city pages using real location information.", fields: ["city"] },
  { type: "SERVICE", slug: "services", label: "Services", help: "Prepare website service pages through the existing engines.", fields: [] },
  { type: "AIRPORT", slug: "airports", label: "Airports", help: "Prepare airport pages with supplied city and airport identity.", fields: ["city", "airportCode"] },
  { type: "AREA", slug: "areas", label: "Areas", help: "Prepare area pages with real city context.", fields: ["city"] },
  { type: "VEHICLE", slug: "vehicles", label: "Vehicles", help: "Create website vehicle entities. Business vehicle records remain managed by Vehicles.", fields: [] },
] as const satisfies readonly { type: WebsiteEntityType; slug: string; label: string; help: string; fields: readonly string[] }[];
export const FACTORY_BATCH_LIMIT = 25;
export const FACTORY_FIELD_LABELS: Record<string, string> = { fromCity: "Origin city", toCity: "Destination city", city: "City", airportCode: "Airport code" };
