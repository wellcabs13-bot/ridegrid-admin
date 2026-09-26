import "server-only";
import manifest from "@/data/seo/phase1-page-manifest.json";
import images from "@/data/seo/phase1-image-manifest.json";
import type { Phase1Page } from "../website-seo/page-factory/phase1-types";
import type { PublicPage, PublicSection } from "./types";

export const phase1Pages = manifest as Phase1Page[];
const byPath = new Map(phase1Pages.map(page => [page.canonicalUrl, page]));
const base = "https://www.wellcabs.com";
export function phase1Record(pathname: string) { return byPath.get(pathname); }
export function phase1SitemapEntries() {
  return phase1Pages.filter(page => page.indexState === "READY_INDEX").map(page => ({ url: base + page.canonicalUrl }));
}
export function phase1PublicPage(pathname: string): PublicPage | null {
  const page = byPath.get(pathname);
  if (!page) return null;
  const canonical = base + page.canonicalUrl;
  const section = (id: string, type: PublicSection["type"], heading: string, paragraphs: string[] = []): PublicSection => ({ id, type, heading, paragraphs, benefits: [], faqs: [], links: [], cta: null });
  const sections = [section("hero", "HERO", page.h1, [page.intro])];
  if (page.bookingSupported) sections.push(section("search", "SEARCH", "Search available cars"));
  sections.push(...page.editorial.map((item, i) => section(`editorial-${i}`, "CONTENT", item.heading, item.paragraphs)));
  if (page.bookingSupported) sections.push(section("marketplace", "MARKETPLACE", "Review the live quote before booking"));
  sections.push({ ...section("faq", "FAQ", "Booking questions"), faqs: page.faqs });
  const labels: Record<string, string> = { city: "City hubs", route: "Related intercity journeys", area: "Pickup areas", service: "Choose a service", vehicle: "Vehicle preferences", airport: "Airport planning", tour: "Tour circuits" };
  for (const family of Object.keys(labels)) {
    const links = page.links.filter(link => link.family === family);
    if (links.length) sections.push({ ...section(`links-${family}`, "RELATED", labels[family]), links });
  }
  if (page.bookingSupported) sections.push({ ...section("cta", "CTA", `Plan your journey from ${page.city}`), cta: { label: "Search Available Cars", href: "#ride-search" } });
  const breadcrumbs = [{ label: "Home", href: "/" }, ...(page.pageType === "city" ? [] : page.links.filter(l => l.family === "city").slice(0, 1).map(l => ({ label: l.label, href: l.href }))), { label: page.h1, href: page.canonicalUrl }];
  const image = images.find(item => item.pageId === page.pageId && item.status === "APPROVED" && /^\/media\/phase1\/[a-zA-Z0-9-]+\.webp$/.test(item.assetPath));
  const heroImage = image ? { src: image.assetPath, alt: image.altText, caption: "AI-generated travel illustration" } : undefined;
  return { title: page.h1, entityName: page.entity, entityType: page.pageType.toUpperCase(), pathname,
    searchContext: { ...page.search, destinations: phase1Pages.filter(p => p.pageType === "route" && p.city === page.city).map(p => p.search.destination!).filter(Boolean) }, phase1: true, bookingSupported: page.bookingSupported, sections, links: page.links, breadcrumbs, images: { heroImage, ogImage: heroImage },
    seo: { title: page.title, description: page.description, canonical, robots: { index: page.indexState === "READY_INDEX", follow: true }, ogImage: heroImage,
      schema: { "@context": "https://schema.org", "@graph": [
        { "@type": "WebPage", "@id": canonical + "#page", url: canonical, name: page.h1, description: page.description },
        { "@type": "BreadcrumbList", "@id": canonical + "#breadcrumbs", itemListElement: breadcrumbs.map((link, i) => ({ "@type": "ListItem", position: i + 1, name: link.label, item: base + link.href })) },
      ] } } };
}
