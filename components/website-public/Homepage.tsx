import type { resolveHomepage } from "@/lib/website-public/homepage";
import PublicShell from "./PublicShell";
import HeroSearch from "./HeroSearch";
import { ContentBlocks, CTA, Hero, MarketplaceSection, RelatedPages } from "./Content";
import s from "./public.module.css";
export default function Homepage({ page }: { page: Awaited<ReturnType<typeof resolveHomepage>> }) {
  const { chrome, hero, sections, discovery } = page;
  const hasSearch = sections.some(s => s.type === "SEARCH"), searchHref = hasSearch ? "#ride-search" : "/marketplace";
  const media = chrome.media.find(m => m.category === "HERO")?.asset;
  const firstCta = sections.findIndex(s => s.type === "CTA"), lastCta = sections.findLastIndex(s => s.type === "CTA");
  function renderSection(section: typeof sections[number]) {
    switch (section.type) {
      case "HERO": return <Hero key={section.id} title={hero.title || section.heading || "RideGrid"} eyebrow={hero.eyebrow || "RideGrid · Wellcabs"} description={hero.subtitle || section.description} media={media} links={[
        ...(hero.primaryCtaHref && hero.primaryCtaLabel ? [{ label: hero.primaryCtaLabel, href: hero.primaryCtaHref }] : []),
        ...(hero.secondaryCtaHref && hero.secondaryCtaLabel ? [{ label: hero.secondaryCtaLabel, href: hero.secondaryCtaHref }] : []),
      ]} />;
      case "SEARCH": return <HeroSearch key={section.id} heading={section.heading || undefined} description={section.description || undefined} />;
      case "ROUTES": return <RelatedPages key={section.id} heading={section.heading || undefined} links={discovery} />;
      case "MARKETPLACE": return <MarketplaceSection key={section.id} heading={section.heading || undefined} description={section.description || undefined} searchHref={searchHref} />;
      case "CTA": return <CTA key={section.id} heading={section.heading || "Make your next move."} description={section.description} link={{ label: "Find your ride", href: searchHref }} />;
      case "CONTENT": return section.heading || section.description ? <section key={section.id} className={s.section}><div className={`${s.container} ${s.prose}`}><h2>{section.heading}</h2><p>{section.description}</p></div></section> : null;
      // Trust claims come from scoped ACTIVE blocks; no standalone review data is configured in W8.
      case "TRUST": case "REVIEWS": return null;
      default: return null;
    }
  }
  return <PublicShell navigation={chrome.navigation}><ContentBlocks blocks={chrome.blocks} placement="BEFORE_PRIMARY_CONTENT" />{sections.map((section, i) => <div key={section.id} className="contents">{i === firstCta && <ContentBlocks blocks={chrome.blocks} placement="BEFORE_CTA" />}{renderSection(section)}{i === lastCta && <ContentBlocks blocks={chrome.blocks} placement="AFTER_CTA" />}</div>)}<ContentBlocks blocks={chrome.blocks} placement="AFTER_PRIMARY_CONTENT" />{firstCta < 0 && <><ContentBlocks blocks={chrome.blocks} placement="BEFORE_CTA" /><ContentBlocks blocks={chrome.blocks} placement="AFTER_CTA" /></>}</PublicShell>;
}
