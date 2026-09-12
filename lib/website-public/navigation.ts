import type { WebsitePublicNavigationItem } from "../website-seo/public-navigation/types";
import type { PublicNavLink } from "./types";
import { publicHref } from "./safety";
export function publicNavigation(items: WebsitePublicNavigationItem[], configured: boolean): PublicNavLink[] {
  if (!configured) return [
    { label: "Home", href: "/website-preview", location: "HEADER" },
    { label: "Find a ride", href: "/marketplace", location: "HEADER" },
    { label: "Search journeys", href: "/marketplace", location: "FOOTER_PRIMARY" },
  ];
  return [...items].filter(i => i.enabled).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)).flatMap(i => {
    const href = publicHref(i.href);
    if (!href || (i.linkType === "INTERNAL" ? !href.startsWith("/") : !/^https?:\/\//.test(href))) return [];
    return [{ label: i.label, href, location: i.location, newTab: i.openInNewTab }];
  });
}
