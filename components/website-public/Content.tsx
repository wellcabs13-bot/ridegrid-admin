import Image from "./ResilientImage";
import Link from "next/link";
import { ArrowUpRight, Search, CarFront, CalendarCheck2 } from "lucide-react";
import type { PublicBlock, PublicLink, PublicMedia, PublicPage } from "@/lib/website-public/types";
import { PublicAnchor } from "./PublicShell";
import { jsonLd } from "@/lib/website-public/safety";
import s from "./public.module.css";
export function Schema({ schema }: { schema: PublicPage["seo"]["schema"] }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />; }
export function Breadcrumbs({ links }: { links: PublicLink[] }) { return links.length ? <nav aria-label="Breadcrumb" className={s.breadcrumbs}>{links.map((link, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> / </span>}<PublicAnchor link={link} /></span>)}</nav> : null; }
export function Hero({ title, eyebrow, description, media, links = [], breadcrumbs = [], compact = false }: { title: string; eyebrow: string; description?: string; media?: PublicMedia | null; links?: PublicLink[]; breadcrumbs?: PublicLink[]; compact?: boolean }) {
  return <section className={`${s.hero} ${compact ? s.compactHero : ""}`}><div className={s.container}><Breadcrumbs links={breadcrumbs} /><div className={s.heroGrid}><div><p className={s.eyebrow}>{eyebrow}</p><h1>{title}</h1>{description && <p className={s.heroDescription}>{description}</p>}<div className={s.actions}>{links.map((link, i) => <PublicAnchor key={i} link={link} className={i ? s.secondaryButton : s.button}>{link.label}<ArrowUpRight size={17} /></PublicAnchor>)}</div></div><div className={s.heroVisual}>{media ? <Image src={media.src} alt={media.alt} fill priority sizes="(max-width: 700px) 100vw, 48vw" unoptimized={!compact} className="object-cover" /> : <div className={s.road} aria-hidden="true" />}<p className={s.visualCaption}>{media?.caption || "The everyday. The getaway. Your next journey."}</p></div></div></div></section>;
}
export function MarketplaceSection({ heading = "Find the right ride for your plans.", description = "Search your route and pickup time to see current vehicle options and fares.", searchHref = "#ride-search" }: { heading?: string; description?: string; searchHref?: string }) {
  return <section className={`${s.section} ${s.marketplace}`}><div className={`${s.container} ${s.marketplaceGrid}`}><div><p className={s.eyebrow}>The RideGrid marketplace</p><h2>{heading}</h2><p className={s.sectionIntro}>{description}</p><Link href={searchHref} className={s.button}>Explore your options <ArrowUpRight size={17} /></Link></div><div className={s.steps}>{[
    { Icon: Search, title: "Start with your journey", body: "Select your route, pickup date and time." },
    { Icon: CarFront, title: "Compare your options", body: "Explore the vehicles and fares returned for your search." },
    { Icon: CalendarCheck2, title: "Continue to booking", body: "Review the trip details and follow the booking and payment steps." },
  ].map(({ Icon, title, body }) => <div className={s.step} key={title}><span className={s.stepIcon}><Icon size={20} /></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></div></section>;
}
export function CTA({ heading, description, link = { label: "Find your ride", href: "/marketplace" } }: { heading: string; description?: string; link?: PublicLink }) {
  return <section className={s.section}><div className={s.container}><div className={s.cta}><p className={s.eyebrow}>Your next journey</p><h2>{heading}</h2>{description && <p>{description}</p>}<div className={s.actions}><PublicAnchor link={link} className={s.button}>{link.label}<ArrowUpRight size={17} /></PublicAnchor></div></div></div></section>;
}
export function RelatedPages({ heading = "Explore more journeys", links }: { heading?: string; links: (PublicLink & { type?: string; description?: string })[] }) {
  if (!links.length) return null;
  return <section className={s.section}><div className={s.container}><p className={s.eyebrow}>Discover RideGrid</p><h2>{heading}</h2>{links.length > 8 ? <ul className={s.linkList}>{links.map(link => <li key={link.href}><PublicAnchor link={link} /></li>)}</ul> : <div className={s.grid}>{links.map((link, i) => <article key={`${link.href}-${i}`} className={s.card}>{link.type && <span className={s.tag}>{link.type}</span>}<h3><PublicAnchor link={link} /></h3>{link.description && <p>{link.description}</p>}<PublicAnchor link={link} className={s.cardLink}>Explore journey <span aria-hidden="true">↗</span></PublicAnchor></article>)}</div>}</div></section>;
}
export function ContentBlocks({ blocks, placement }: { blocks: PublicBlock[]; placement: PublicBlock["placement"] }) {
  const items = blocks.filter(b => b.placement === placement && (b.heading || b.body || b.cta));
  if (!items.length) return null;
  return <section className={s.section} aria-label="Journey information"><div className={`${s.container} ${s.grid}`}>{items.map(b => <article key={b.id} className={s.card} data-category={b.category}>{b.eyebrow && <p className={s.eyebrow}>{b.eyebrow}</p>}{b.heading && <h2 className="!text-2xl">{b.heading}</h2>}{b.body && <p className="whitespace-pre-line">{b.body}</p>}{b.cta && <PublicAnchor link={b.cta} className={s.cardLink}>{b.cta.label} <span aria-hidden="true">↗</span></PublicAnchor>}</article>)}</div></section>;
}
export function FAQ({ heading, items }: { heading: string; items: { question: string; answer: string }[] }) {
  if (!items.length) return null;
  return <section className={s.section}><div className={s.container}><p className={s.eyebrow}>Good to know</p><h2>{heading}</h2>{items.map((f, i) => <details key={i} className={s.faq}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div></section>;
}
