import manifest from "@/data/seo/phase1-page-manifest.json";
import { locationKey } from "@/lib/website-public/marketplace";

// Pricing locations come from the published website page catalog (city, route and tour
// pages), so a newly published route page becomes priceable without a second city list.
type CatalogPage = { pageType: string; city: string; entity: string; slug: string; search?: { city?: string; destination?: string } };
export type CatalogTour = { slug: string; name: string; title: string };
export interface PricingCatalog { cities: string[]; routes: Record<string, string[]>; tours: Record<string, CatalogTour[]> }

export const cityKey = (value?: string | null) => locationKey((value || "").replace(/\s+/g, " "));

function build(pages: CatalogPage[]): PricingCatalog {
  const cities = new Map<string, string>(), routes = new Map<string, Map<string, string>>(), tours = new Map<string, CatalogTour[]>();
  const origin = (name: string) => { const key = cityKey(name); if (!cities.has(key)) cities.set(key, name.trim()); return cities.get(key)!; };
  for (const page of pages) if (page.pageType === "city" && page.city?.trim()) origin(page.city);
  for (const page of pages) {
    if (page.pageType === "route") {
      const from = page.search?.city?.trim() || page.city?.trim(), to = page.search?.destination?.trim();
      if (!from || !to || cityKey(from) === cityKey(to)) continue;
      const name = origin(from), list = routes.get(name) || new Map<string, string>();
      if (!list.has(cityKey(to))) list.set(cityKey(to), to);
      routes.set(name, list);
    } else if (page.pageType === "tour" && page.city?.trim() && page.slug) {
      const name = origin(page.city), list = tours.get(name) || [];
      if (!list.some(tour => tour.slug === page.slug)) list.push({ slug: page.slug, title: page.entity.trim(), name: page.entity.replace(new RegExp(`^${page.city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+to\\s+`, "i"), "").trim() });
      tours.set(name, list);
    }
  }
  return {
    cities: [...cities.values()],
    routes: Object.fromEntries([...routes].map(([from, list]) => [from, [...list.values()]])),
    tours: Object.fromEntries(tours),
  };
}

let cached: PricingCatalog | null = null;
export function pricingCatalog(pages: CatalogPage[] = manifest as unknown as CatalogPage[]) {
  if (pages !== (manifest as unknown)) return build(pages);
  return cached ||= build(pages);
}
export function catalogCity(catalog: PricingCatalog, value: unknown) {
  return typeof value === "string" && value.trim() ? catalog.cities.find(city => cityKey(city) === cityKey(value)) : undefined;
}
