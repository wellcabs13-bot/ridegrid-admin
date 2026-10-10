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
// Published tours are bookable through the Tour marketplace: cars appear only where a vendor
// has priced that tour. The generated copy predates Tour pricing, so its "not bookable"
// lines are replaced here rather than regenerating the SEO manifest.
const NOT_BOOKABLE = /not currently (bookable|available)/i;
const TOUR_BOOKING_FAQ = "Yes. Choose your date and time in the search on this page. Cars appear only when a vendor has published a price for this tour, and each listing shows the full fare and any tour notes before you book.";
function bookableTour(page: Phase1Page): Phase1Page {
  if (page.pageType !== "tour") return page;
  return { ...page, bookingSupported: true,
    description: page.description.replace(/s*Dedicated Tours are not currently bookable online./i, " Compare cars with a published tour price and book online.").trim(),
    editorial: page.editorial.map(item => ({ ...item, paragraphs: item.paragraphs.filter(text => !NOT_BOOKABLE.test(text)) })).filter(item => item.paragraphs.length),
    faqs: page.faqs.map(faq => NOT_BOOKABLE.test(faq.answer) ? { ...faq, answer: TOUR_BOOKING_FAQ } : faq),
    search: { city: page.city, service: "TOUR_PACKAGE", tour: page.entity, pageId: page.pageId, pageType: page.pageType } };
}
export function phase1PublicPage(pathname: string): PublicPage | null {
  const record = byPath.get(pathname);
  if (!record) return null;
  const page = bookableTour(record);
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
    searchContext: page.pageType === "tour" ? page.search : { ...page.search, destinations: phase1Pages.filter(p => p.pageType === "route" && p.city === page.city).map(p => p.search.destination!).filter(Boolean) }, phase1: true, bookingSupported: page.bookingSupported, sections, links: page.links, breadcrumbs, images: { heroImage, ogImage: heroImage },
    seo: { title: page.title, description: page.description, canonical, robots: { index: page.indexState === "READY_INDEX", follow: true }, ogImage: heroImage,
      schema: { "@context": "https://schema.org", "@graph": [
        { "@type": "WebPage", "@id": canonical + "#page", url: canonical, name: page.h1, description: page.description },
        { "@type": "BreadcrumbList", "@id": canonical + "#breadcrumbs", itemListElement: breadcrumbs.map((link, i) => ({ "@type": "ListItem", position: i + 1, name: link.label, item: base + link.href })) },
      ] } } };
}
