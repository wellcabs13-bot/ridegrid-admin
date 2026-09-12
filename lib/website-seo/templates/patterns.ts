import type { WebsiteEntityType } from "@/lib/website-seo/entities";

export const WEBSITE_ENTITY_PATH_PATTERNS: Record<
  WebsiteEntityType,
  string
> = {
  ROUTE: "/routes/{slug}",
  CITY: "/cities/{slug}",
  SERVICE: "/services/{slug}",
  AIRPORT: "/airports/{slug}",
  AREA: "/areas/{slug}",
  VEHICLE: "/vehicles/{slug}",
};

export function getDefaultWebsiteEntityPathPattern(
  type: WebsiteEntityType
): string {
  return WEBSITE_ENTITY_PATH_PATTERNS[type];
}
