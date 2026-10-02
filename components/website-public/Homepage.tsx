import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CarFront, Headset, IndianRupee, LockKeyhole, MapPinned, Plane, Route, ShieldCheck, UserCheck } from "lucide-react";
import { HOMEPAGE_HERO, type resolveHomepage } from "@/lib/website-public/homepage";
import { homepageImage, type HomepageImageSlot } from "@/lib/website-public/homepage-assets";
import { WELLCABS } from "@/lib/website-public/brand";
import { ContentBlocks, FAQ } from "./Content";
import HeroSearch from "./HeroSearch";
import HomepageMarketplaceRoutes from "./HomepageMarketplaceRoutes";
import ManagedImage from "./ManagedImage";
import PublicShell from "./PublicShell";
import Phase1CityLinks from "./Phase1CityLinks";
import h from "./Home.module.css";

type Page = Awaited<ReturnType<typeof resolveHomepage>>;

// Only services RideGrid supports today. Airport transfers are searchable; cars
// appear as vendors publish airport fares.
const SERVICES: { id: string; title: string; body: string; href: string; cta: string; Icon: typeof Route; slot: HomepageImageSlot }[] = [
  { id: "outstation", title: "Outstation Cabs", body: "One-way and round trips between cities, with the exact car and driver you choose.", href: "/services/one-way-cab/pune", cta: "Explore outstation", Icon: Route, slot: "outstation" },
  { id: "local-cabs", title: "Local Cab Service", body: "8 hours / 80 km and 12 hours / 120 km packages for a day around the city.", href: "/services/local-car-rental/pune", cta: "Explore local packages", Icon: MapPinned, slot: "local" },
  { id: "airport-transfers", title: "Airport Transfers", body: "Pickups and drops for Pune and Mumbai airports, planned around your flight.", href: "/airports/pune-airport", cta: "Explore airport transfers", Icon: Plane, slot: "airport" },
  { id: "corporate-rental", title: "Corporate Car Rental", body: "Employee travel with approvals, policies, budgets and one monthly bill.", href: "/corporate-travel", cta: "Explore corporate travel", Icon: Building2, slot: "corporateService" },
];

const TRUST = [
  { Icon: BadgeCheck, title: "Verified vendors", body: "Every fleet partner is reviewed by RideGrid before its cars can be listed." },
  { Icon: UserCheck, title: "Verified drivers", body: "Drivers are verified and assigned to the car you book." },
  { Icon: CarFront, title: "Exact vehicle selection", body: "You pick the actual car and its driver — not just a category." },
  { Icon: IndianRupee, title: "Transparent pricing", body: "The full fare, taxes and inclusions are shown before you book." },
  { Icon: Headset, title: "Professional support", body: `Real people on phone, email and WhatsApp at +91 ${WELLCABS.phone}.` },
  { Icon: LockKeyhole, title: "Secure booking", body: "Payments are confirmed by the payment gateway on our server, never in the browser." },
];

const FAQS = [
  { question: "How do I book a cab?", answer: "Choose Outstation, Round Trip, Local or Airport in the search above, add your city, date and time, then compare the real cars returned. Pick your car and driver, review the full fare and continue to booking." },
  { question: "Can I choose the exact car?", answer: "Yes. Results show the actual vehicle, its category and seating, and the assigned driver. What you book is the car you selected." },
  { question: "Where do I see the complete fare?", answer: "Each result shows the fare returned by RideGrid's pricing for your trip. The booking step shows the full breakdown, including taxes, before you pay." },
  { question: "Do you offer travel for companies?", answer: "Yes. Companies get a Corporate Travel Portal with employee travel policies, approvals, budgets, corporate credit and consolidated invoices." },
];

// Resolves a homepage slot to the real photo when one has been added, else the bundled placeholder.
function HomeImage({ slot, sizes, priority }: { slot: HomepageImageSlot; sizes: string; priority?: boolean }) {
  const { src } = homepageImage(slot);
  return <Image src={src} alt="" fill sizes={sizes} priority={priority} fetchPriority={priority ? "high" : undefined} unoptimized={src.endsWith(".svg")} className={h.cover} />;
}

export default function Homepage({ page, options }: { page: Page; options?: unknown[] }) {
  const { chrome, hero, sections, discovery } = page;
  const enabled = (type: string) => sections.find((section) => section.type === type);
  const managedHero = chrome.images?.heroImage ?? chrome.media.find((item) => item.category === "HERO")?.asset ?? null;
  // A different hero assigned in the Media Manager wins over the optimised default.
  const customHero = managedHero && managedHero.src !== HOMEPAGE_HERO.managedSource ? managedHero : null;
  const searchSection = enabled("SEARCH"), routesSection = enabled("ROUTES"), ctaSection = enabled("CTA");
  const [line1, ...rest] = (hero.title || "Travel Further With Confidence").split(/\s+(?=With\b)/);
  return <PublicShell navigation={chrome.navigation}>
    <ContentBlocks blocks={chrome.blocks} placement="BEFORE_PRIMARY_CONTENT" />

    <section className={h.hero} aria-labelledby="home-title">
      <div className={`${h.container} ${h.heroGrid}`}>
        <div className={h.heroContent}>
          <p className={h.kicker}><span aria-hidden="true" />RideGrid by Wellcabs</p>
          <h1 id="home-title" aria-label={hero.title || "Travel Further With Confidence"}><span aria-hidden="true">{line1}{rest.length > 0 && <><br /><em>{rest.join(" ")}</em></>}</span></h1>
          <p className={h.lead}>{hero.subtitle || "Clean cars, professional drivers and the exact vehicle you choose — with transparent pricing for reliable travel."}</p>
          <div className={h.heroActions}>
            <Link href="/marketplace" className={h.primary}>Book a Cab <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/corporate-travel" className={h.secondary}>Corporate Travel</Link>
          </div>
          <ul className={h.points} aria-label="Why travel with RideGrid">
            <li><ShieldCheck size={18} aria-hidden="true" />Clean, verified cars</li>
            <li><UserCheck size={18} aria-hidden="true" />Professional drivers</li>
            <li><IndianRupee size={18} aria-hidden="true" />Transparent fares</li>
          </ul>
        </div>
        <div className={h.heroVisual} aria-hidden="true">
          {customHero
            ? <ManagedImage media={customHero} cover />
            : <HomeImage slot="hero" priority sizes="(max-width: 900px) 100vw, 46vw" />}
        </div>
      </div>
      {searchSection && <div className={`${h.container} ${h.searchDock}`}>
        <HeroSearch heading={searchSection.heading || "Where are we taking you?"} description="Outstation, round trip, local or airport — compare real cars with their drivers." initialOptions={options} />
      </div>}
    </section>
    {!searchSection && <div id="ride-search" />}

    {routesSection && <HomepageMarketplaceRoutes options={options ?? []} media={chrome.images?.cardImage} />}

    <section id="services" className={h.section} aria-labelledby="services-title">
      <span id="outstation" /><span id="local-cabs" /><span id="airport-transfers" />
      <div className={h.container}>
        <div className={h.heading}><p className={h.eyebrow}>Our services</p><h2 id="services-title">Every kind of road trip, one marketplace.</h2></div>
        <div className={h.serviceGrid}>{SERVICES.map((service, i) => <article key={service.id} className={h.serviceCard}>
          <div className={h.serviceImage}>{i === 0 && chrome.images?.sectionImage1 ? <ManagedImage media={chrome.images.sectionImage1} cover /> : <HomeImage slot={service.slot} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" />}<span className={h.serviceIcon}><service.Icon size={20} aria-hidden="true" /></span></div>
          <div className={h.serviceBody}><h3>{service.title}</h3><p>{service.body}</p><Link href={service.href} prefetch={false}>{service.cta}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </article>)}</div>
        <p className={h.footnote}>Service images are for illustration.</p>
      </div>
    </section>

    <section className={`${h.section} ${h.trust}`} aria-labelledby="trust-title">
      <div className={h.container}>
        <div className={h.heading}><p className={h.eyebrow}>Why RideGrid</p><h2 id="trust-title">Confidence built into every booking.</h2></div>
        <div className={h.trustGrid}>{TRUST.map(({ Icon, title, body }) => <article key={title}><span><Icon size={22} aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </div>
    </section>

    <section id="corporate" className={`${h.section} ${h.corporate}`} aria-labelledby="corporate-title">
      <div className={`${h.container} ${h.corporateGrid}`}>
        <div>
          <p className={h.eyebrow}>For companies</p>
          <h2 id="corporate-title">Corporate travel, under control.</h2>
          <p className={h.sectionLead}>Employee mobility and business travel on one account — with the rules your finance team needs.</p>
          <ul className={h.checks}>
            {["Travel policies by company, branch, department or employee", "Multi-step approval workflows", "Company, branch and department budgets", "Corporate credit and centralised monthly billing"].map((t) => <li key={t}><BadgeCheck size={18} aria-hidden="true" />{t}</li>)}
          </ul>
          <div className={h.actions}>
            <Link href="/corporate-travel" className={h.primary}>Corporate Solutions <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/corporate-travel#enquiry" className={h.secondary}>Get Corporate Quote</Link>
            <Link href="/corporate-login" className={h.textLink}>Corporate Login</Link>
          </div>
        </div>
        <div className={h.corporateVisual}>{chrome.images?.sectionImage2 ? <ManagedImage media={chrome.images.sectionImage2} cover /> : <HomeImage slot="corporate" sizes="(max-width: 900px) 100vw, 45vw" />}</div>
      </div>
    </section>

    {discovery.length > 0 && <section id="travel-guides" className={h.section} aria-labelledby="guides-title"><div className={h.container}>
      <div className={h.heading}><p className={h.eyebrow}>Travel guides</p><h2 id="guides-title">Places worth the drive.</h2></div>
      <div className={h.guideGrid}>{discovery.slice(0, 6).map((item) => <Link key={item.href} href={item.href} prefetch={false} className={h.guideCard}><span className={h.guideType}>{item.type.toLowerCase()}</span><strong>{item.label}</strong>{item.description && <span>{item.description}</span>}</Link>)}</div>
    </div></section>}
    {discovery.length === 0 && <span id="travel-guides" />}
    <Phase1CityLinks />

    {sections.filter((section) => section.type === "CONTENT" && (section.heading || section.description)).map((section) => <section className={h.section} key={section.id}><div className={h.container}><h2 className={h.contentHeading}>{section.heading}</h2><p className={h.sectionLead}>{section.description}</p></div></section>)}

    <div id="about"><FAQ heading="Before your next journey" items={FAQS} /></div>

    <ContentBlocks blocks={chrome.blocks} placement="BEFORE_CTA" />
    <section className={h.finalCta} aria-labelledby="cta-title">
      {chrome.images?.featuredImage && <div className={h.ctaMedia} aria-hidden="true"><ManagedImage media={chrome.images.featuredImage} cover /></div>}
      <div className={`${h.container} ${h.ctaInner}`}>
        <div><h2 id="cta-title">{ctaSection?.heading && ctaSection.heading !== "Ready when you are." ? ctaSection.heading : "Ready for your next journey?"}</h2><p>{ctaSection?.description && ctaSection.description !== "Search RideGrid for your next journey." ? ctaSection.description : "Search real cars and drivers, see the full fare and book in minutes."}</p></div>
        <div className={h.actions}><Link href="/marketplace" className={h.primary}>Book a Cab <ArrowRight size={17} aria-hidden="true" /></Link><a href={WELLCABS.whatsapp} target="_blank" rel="noopener noreferrer" className={h.secondaryDark}>Plan on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></div>
      </div>
    </section>
    <ContentBlocks blocks={chrome.blocks} placement="AFTER_CTA" />
    <ContentBlocks blocks={chrome.blocks} placement="AFTER_PRIMARY_CONTENT" />
  </PublicShell>;
}
