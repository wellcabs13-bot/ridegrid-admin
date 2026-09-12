import { websiteHomepageRepository } from "../website-seo/homepage/repository";
import type { WebsiteHomepageConfig } from "../website-seo/homepage/types";
import { publicHref } from "./safety";
import { resolveDiscovery, resolvePublicChrome } from "./repository";
// Presentation fallback only. Never saved to SystemSetting.
const fallback: WebsiteHomepageConfig = {
  version: 1,
  hero: { eyebrow: "RideGrid · Wellcabs", title: "YOUR CAR. YOUR PRICE. YOUR CHOICE.", subtitle: "From everyday plans to the open road. Find a ride that fits your journey.", primaryCtaLabel: "Find your ride", primaryCtaHref: "/marketplace", secondaryCtaLabel: "Explore journeys", secondaryCtaHref: "/#discover" },
  sections: [
    { id: "hero", type: "HERO", enabled: true, order: 0, heading: "", description: "" },
    { id: "search", type: "SEARCH", enabled: true, order: 1, heading: "Where are we taking you?", description: "Choose your journey. Explore available vehicles and fares." },
    { id: "routes", type: "ROUTES", enabled: true, order: 2, heading: "A new journey starts here.", description: "Explore routes, places and services." },
    { id: "marketplace", type: "MARKETPLACE", enabled: true, order: 3, heading: "Find the right ride for your plans.", description: "Search your route and pickup time to see current vehicle options and fares." },
    { id: "cta", type: "CTA", enabled: true, order: 4, heading: "Make your next move.", description: "Your destination is only the beginning." },
  ],
};
export function homepagePresentation(config: WebsiteHomepageConfig | null) {
  const source = config ?? fallback;
  return { hero: { ...source.hero, primaryCtaHref: publicHref(source.hero.primaryCtaHref) || "", secondaryCtaHref: publicHref(source.hero.secondaryCtaHref) || "" },
    sections: source.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map(s => ({ id: s.id, type: s.type, heading: s.heading, description: s.description })) };
}
export async function resolveHomepage() {
  const [setting, chrome, discovery] = await Promise.all([websiteHomepageRepository.get(), resolvePublicChrome("HOMEPAGE"), resolveDiscovery()]);
  return { ...homepagePresentation(setting.config), chrome, discovery };
}
