import type { PublicChrome, PublicPage, PublicSection } from "@/lib/website-public/types";
import PublicShell from "./PublicShell";
import HeroSearch from "./HeroSearch";
import { ContentBlocks, CTA, FAQ, Hero, MarketplaceSection, RelatedPages, Schema } from "./Content";
import s from "./public.module.css";
import ManagedImage from "./ManagedImage";
import Link from "next/link";
function Section({ section, searchHref, page }: { section: PublicSection; searchHref: string; page: PublicPage }) {
  switch (section.type) {
    case "HERO": return null;
    case "SEARCH": return <HeroSearch heading={section.heading} context={page.searchContext} />;
    case "MARKETPLACE": case "VEHICLES": case "PRICING": return <MarketplaceSection heading={section.heading} searchHref={searchHref} />;
    case "FAQ": return <FAQ heading={section.heading} items={section.faqs} />;
    case "REVIEWS": case "TRUST": return null; // Live bindings are unavailable; W8 trust blocks render separately.
    case "CTA": return <CTA heading={section.heading} description={section.paragraphs.join("\n\n")} link={{ label: section.cta?.label || "Find your ride", href: searchHref }} />;
    case "RELATED": case "ROUTES": case "SERVICES": case "AIRPORTS": case "AREAS": return <RelatedPages heading={section.heading} links={section.links} />;
    default: return section.paragraphs.length || section.benefits.length ? <section className={s.section}><div className={`${s.container} ${s.prose}`}><h2>{section.heading}</h2>{section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}{section.benefits.length > 0 && <ul>{section.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>}</div></section> : null;
  }
}
export default function EntityPage({ page, chrome }: { page: PublicPage; chrome: PublicChrome }) {
  const hero = page.sections.find(s => s.type === "HERO");
  const hasSearch = page.sections.some(s => s.type === "SEARCH"), searchHref = hasSearch ? "#ride-search" : "/marketplace";
  const media = page.images?.heroImage || chrome.media.find(m => m.category === page.entityType)?.asset || chrome.media.find(m => m.category === "GENERAL")?.asset || chrome.media.find(m => m.category === "HERO")?.asset;
  const firstCta = page.sections.findIndex(s => s.type === "CTA"), lastCta = page.sections.findLastIndex(s => s.type === "CTA");
  const supporting = [page.images?.sectionImage1, page.images?.sectionImage2, page.images?.featuredImage, page.images?.galleryImage1, page.images?.galleryImage2].filter(Boolean);
  return <PublicShell navigation={chrome.navigation}>
    <Schema schema={page.seo.schema} />
    <Hero compact={page.phase1} title={page.title} eyebrow={`${page.entityType.toLowerCase()} journeys`} description={hero?.paragraphs.join(" ") || page.seo.description} media={page.phase1 ? page.images?.heroImage : media} breadcrumbs={page.breadcrumbs} links={[{ label: page.bookingSupported === false ? "Explore related journeys" : "Search Available Cars", href: page.bookingSupported === false ? "#discover" : searchHref }]} />
    <ContentBlocks blocks={chrome.blocks} placement="BEFORE_PRIMARY_CONTENT" />
    {page.sections.map((section, i) => <div key={section.id} className="contents">
      {i === firstCta && <ContentBlocks blocks={chrome.blocks} placement="BEFORE_CTA" />}
      {section.type === "RELATED" && page.sections.findIndex(s => s.type === "RELATED") === i && <div id="discover" />}
      <Section section={section} searchHref={searchHref} page={page} />
      {supporting[i] && <div className={s.container}><ManagedImage media={supporting[i]} /></div>}
      {i === lastCta && <ContentBlocks blocks={chrome.blocks} placement="AFTER_CTA" />}
    </div>)}
    {supporting.slice(page.sections.length).map((image, i) => <div key={i} className={s.container}><ManagedImage media={image} /></div>)}
    <ContentBlocks blocks={chrome.blocks} placement="AFTER_PRIMARY_CONTENT" />
    {firstCta < 0 && <><ContentBlocks blocks={chrome.blocks} placement="BEFORE_CTA" /><ContentBlocks blocks={chrome.blocks} placement="AFTER_CTA" /></>}
    {!page.sections.some(s => s.type === "RELATED") && <RelatedPages links={page.links} />}
    {page.phase1 && hasSearch && <Link href="#ride-search" className={s.mobileBooking}>Search Available Cars</Link>}
  </PublicShell>;
}
