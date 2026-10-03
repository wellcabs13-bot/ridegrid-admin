import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { phase1Pages } from "@/lib/website-public/phase1";
import { homepageImage, homepageRouteImage } from "@/lib/website-public/homepage-assets";
import { locationKey, normalizePricingOptions } from "@/lib/website-public/marketplace";
import type { PublicMedia } from "@/lib/website-public/types";
import ManagedImage from "./ManagedImage";
import h from "./Home.module.css";

type Card = { from: string; to: string; oneWay: boolean; roundTrip: boolean; href: string };
const title = (v: string) => v.replace(/\b\w/g, (c) => c.toUpperCase());

// Routes offered by current central pricing (approved rate versions on verified,
// available cars). No starting price is shown: fares depend on the car, date and
// trip, and are quoted by the pricing engine on the results page.
export function popularRoutes(options: unknown[]): Card[] {
  const byRoute = new Map<string, Card>();
  for (const o of normalizePricingOptions(options)) {
    if (o.pricingType !== "OUTSTATION" || !o.fromCity || !o.toCity) continue;
    const key = `${locationKey(o.fromCity)}>${locationKey(o.toCity)}`;
    const page = phase1Pages.find((p) => p.pageType === "route" && locationKey(p.search.city || "") === locationKey(o.fromCity!) && locationKey(p.search.destination || "") === locationKey(o.toCity!));
    const card = byRoute.get(key) ?? { from: title(o.fromCity), to: title(o.toCity), oneWay: false, roundTrip: false, href: page?.canonicalUrl ?? "/marketplace" };
    if (o.tripType === "ONEWAY") card.oneWay = true; else card.roundTrip = true;
    byRoute.set(key, card);
  }
  return [...byRoute.values()].sort((a, b) => Number(b.href !== "/marketplace") - Number(a.href !== "/marketplace") || Number(b.oneWay) - Number(a.oneWay) || a.to.localeCompare(b.to)).slice(0, 8);
}

export default function HomepageMarketplaceRoutes({ options, media }: { options: unknown[]; media?: PublicMedia }) {
  const routes = popularRoutes(options);
  if (!routes.length) return null;
  const fallback = homepageImage("routeDefault").src;
  return <section id="popular-routes" className={h.section} aria-labelledby="routes-title">
    <div className={h.container}>
      <div className={h.headingRow}>
        <div className={h.heading}><p className={h.eyebrow}>Popular routes</p><h2 id="routes-title">Routes you can book today.</h2><p className={h.sectionLead}>Live on the RideGrid marketplace now. Open a route to pick your date and compare cars.</p></div>
        <Link href="/marketplace" className={h.textLink}>Search any route <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className={h.routeGrid}>{routes.map((r) => <Link key={`${r.from}-${r.to}`} href={r.href} prefetch={false} className={h.routeCard}>
        <div className={h.routeImage}>{(() => {
          const own = homepageRouteImage(r.to);
          if (own) return <Image src={own.src} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" className={h.cover} />;
          return media ? <ManagedImage media={media} cover /> : <Image src={fallback} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" unoptimized className={h.cover} />;
        })()}</div>
        <div className={h.routeBody}>
          <p className={h.routeTags}>{r.oneWay && <span>One way</span>}{r.roundTrip && <span>Round trip</span>}</p>
          <h3>{r.from} <span aria-hidden="true">→</span><span className="sr-only">to</span> {r.to}</h3>
          <span className={h.routeCta}>View cars · check fare <ArrowRight size={15} aria-hidden="true" /></span>
        </div>
      </Link>)}</div>
    </div>
  </section>;
}
