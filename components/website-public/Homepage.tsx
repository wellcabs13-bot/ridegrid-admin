import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Building2,
  CarFront,
  Check,
  MapPinned,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type { resolveHomepage } from "@/lib/website-public/homepage";

import {
  ContentBlocks,
} from "./Content";

import HeroSearch from "./HeroSearch";
import PublicShell from "./PublicShell";

import h from "./HomepagePremium.module.css";

export default function Homepage({
  page,
}: {
  page: Awaited<
    ReturnType<typeof resolveHomepage>
  >;
}) {
  const {
    chrome,
    hero,
    sections,
    discovery,
  } = page;

  const heroMedia =
    chrome.media.find(
      (item) => item.category === "HERO",
    )?.asset ?? null;

  const searchSection =
    sections.find(
      (section) =>
        section.type === "SEARCH",
    );

  const routesSection =
    sections.find(
      (section) =>
        section.type === "ROUTES",
    );

  const marketplaceSection =
    sections.find(
      (section) =>
        section.type === "MARKETPLACE",
    );

  const ctaSection =
    sections.find(
      (section) =>
        section.type === "CTA",
    );

  const contentSections =
    sections.filter(
      (section) =>
        section.type === "CONTENT" &&
        (
          section.heading ||
          section.description
        ),
    );

  const primaryHref =
    hero.primaryCtaHref ||
    "/#ride-search";

  const secondaryHref =
    hero.secondaryCtaHref ||
    "/marketplace";

  return (
    <PublicShell
      navigation={chrome.navigation}
    >
      <ContentBlocks
        blocks={chrome.blocks}
        placement="BEFORE_PRIMARY_CONTENT"
      />

      {!sections.some(section => section.type === "HERO") && <h1 className="sr-only">{hero.title || "RideGrid by Wellcabs"}</h1>}
      {sections.some(section => section.type === "HERO") && <section className={h.hero}>
        <div className={h.heroGlow} />

        <div className={h.container}>
          <div className={h.heroGrid}>
            <div className={h.heroCopy}>
              <p className={h.eyebrow}>
                <span />
                {hero.eyebrow ||
                  "RIDEGRID · WELLCABS"}
              </p>

              <h1>
                {hero.title ||
                  "YOUR CAR. YOUR PRICE. YOUR CHOICE."}
              </h1>

              <p className={h.heroDescription}>
                {hero.subtitle ||
                  "Search live ride options for everyday travel, airport transfers, local journeys and outstation trips."}
              </p>

              <div className={h.heroActions}>
                <Link
                  href={primaryHref}
                  className={h.primaryButton}
                >
                  {hero.primaryCtaLabel ||
                    "Find your ride"}
                  <ArrowRight size={17} />
                </Link>

                <Link
                  href={secondaryHref}
                  className={h.secondaryButton}
                >
                  {hero.secondaryCtaLabel ||
                    "Explore vehicles"}
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className={h.heroSignals}>
                <span>
                  <Check size={14} />
                  Live marketplace
                </span>

                <span>
                  <Check size={14} />
                  Real vehicle options
                </span>

                <span>
                  <Check size={14} />
                  Connected booking flow
                </span>
              </div>
            </div>

            <div className={h.heroVisual}>
              {heroMedia ? (
                <Image
                  src={heroMedia.src}
                  alt={heroMedia.alt}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 800px) 100vw, 48vw"
                  className={h.heroImage}
                />
              ) : (
                <div
                  className={h.roadVisual}
                  aria-hidden="true"
                >
                  <div
                    className={h.roadLane}
                  />

                  <div className={h.carBadge}>
                    <CarFront size={38} />
                    <span>RideGrid</span>
                  </div>
                </div>
              )}

              <div className={h.visualOverlay}>
                <span>
                  RIDEGRID MARKETPLACE
                </span>

                <strong>
                  One journey.
                  <br />
                  More choice.
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>}

      <section
        className={h.searchStage}
      >
        <HeroSearch
          heading={
            searchSection?.heading ||
            "Where are we taking you?"
          }
          description={
            searchSection?.description ||
            "Choose your journey and search current vehicle options."
          }
        />
      </section>

      <section className={h.assurance}>
        <div
          className={`${h.container} ${h.assuranceGrid}`}
        >
          <div>
            <ShieldCheck />
            <span>
              <strong>
                Connected platform
              </strong>
              <small>
                Search to booking in one flow
              </small>
            </span>
          </div>

          <div>
            <CarFront />
            <span>
              <strong>
                Current options
              </strong>
              <small>
                Marketplace-powered results
              </small>
            </span>
          </div>

          <div>
            <MapPinned />
            <span>
              <strong>
                Multiple journey types
              </strong>
              <small>
                Local, airport and outstation
              </small>
            </span>
          </div>

          <div>
            <Building2 />
            <span>
              <strong>
                Business mobility
              </strong>
              <small>
                Corporate workflows integrated
              </small>
            </span>
          </div>
        </div>
      </section>

      <section className={h.section}>
        <div className={h.container}>
          <div className={h.sectionHeading}>
            <div>
              <p className={h.sectionEyebrow}>
                TRAVEL YOUR WAY
              </p>

              <h2>
                Everything starts with the right ride.
              </h2>
            </div>

            <Link
              href="/marketplace"
              className={h.textLink}
            >
              Explore marketplace
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className={h.serviceGrid}>
            <article className={h.serviceCard}>
              <span className={h.iconBox}>
                <Route />
              </span>

              <div>
                <p>OUTSTATION</p>
                <h3>One Way & Round Trip</h3>
                <span>
                  Search intercity journeys and
                  compare current ride options.
                </span>
              </div>

              <Link href="/#ride-search">
                Search outstation
                <ArrowRight size={15} />
              </Link>
            </article>

            <article className={h.serviceCard}>
              <span className={h.iconBox}>
                <Plane />
              </span>

              <div>
                <p>AIRPORT</p>
                <h3>Airport Transfers</h3>
                <span>
                  Find pickup and drop options
                  through the same RideGrid
                  marketplace.
                </span>
              </div>

              <Link href="/#ride-search">
                Search airport rides
                <ArrowRight size={15} />
              </Link>
            </article>

            <article className={h.serviceCard}>
              <span className={h.iconBox}>
                <MapPinned />
              </span>

              <div>
                <p>LOCAL</p>
                <h3>Local Rides & Rentals</h3>
                <span>
                  Search local journey options
                  using the connected booking
                  engine.
                </span>
              </div>

              <Link href="/#ride-search">
                Search local rides
                <ArrowRight size={15} />
              </Link>
            </article>

            <article className={h.serviceCard}>
              <span className={h.iconBox}>
                <Building2 />
              </span>

              <div>
                <p>BUSINESS</p>
                <h3>
                  Corporate Transportation
                </h3>
                <span>
                  RideGrid connects enterprise
                  mobility with the same
                  operational platform.
                </span>
              </div>

              <Link href="/marketplace">
                Explore RideGrid
                <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {routesSection && discovery.length > 0 && (
        <section
          id="discover"
          className={`${h.section} ${h.softSection}`}
        >
          <div className={h.container}>
            <div className={h.sectionHeading}>
              <div>
                <p className={h.sectionEyebrow}>
                  DISCOVER
                </p>

                <h2>
                  {routesSection?.heading ||
                    "Fresh journeys from RideGrid."}
                </h2>

                <p>
                  {routesSection?.description ||
                    "Explore published routes, cities and services."}
                </p>
              </div>
            </div>

            <div
              className={h.discoveryGrid}
            >
              {discovery
                .slice(0, 12)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={h.discoveryCard}
                  >
                    <div>
                      <span>
                        {item.type}
                      </span>

                      <h3>
                        {item.label}
                      </h3>

                      <p>
                        {item.description}
                      </p>
                    </div>

                    <ArrowRight
                      size={18}
                    />
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <ContentBlocks
        blocks={chrome.blocks}
        placement="BEFORE_CTA"
      />

      {marketplaceSection && <section className={h.marketplace}>
        <div
          className={`${h.container} ${h.marketplaceGrid}`}
        >
          <div>
            <p className={h.sectionEyebrow}>
              RIDEGRID MARKETPLACE
            </p>

            <h2>
              {marketplaceSection?.heading ||
                "Find the right ride for your plans."}
            </h2>

            <p>
              {marketplaceSection?.description ||
                "Search your route and travel details to see current vehicle options and fares."}
            </p>

            <Link
              href="/#ride-search"
              className={h.primaryButton}
            >
              Search now
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className={h.marketplacePanel}>
            <div>
              <Sparkles size={21} />
              <strong>
                Search once
              </strong>
              <span>
                Enter your journey details.
              </span>
            </div>

            <div>
              <CarFront size={21} />
              <strong>
                Compare options
              </strong>
              <span>
                Review current marketplace
                vehicles.
              </span>
            </div>

            <div>
              <ShieldCheck size={21} />
              <strong>
                Continue securely
              </strong>
              <span>
                Move through RideGrid booking
                and payment.
              </span>
            </div>
          </div>
        </div>
      </section>}

      {contentSections.map(
        (section) => (
          <section
            key={section.id}
            className={h.editorialSection}
          >
            <div className={h.container}>
              <p className={h.sectionEyebrow}>
                WELLCABS · RIDEGRID
              </p>

              {section.heading && (
                <h2>{section.heading}</h2>
              )}

              {section.description && (
                <p>
                  {section.description}
                </p>
              )}
            </div>
          </section>
        ),
      )}

      {ctaSection && <section className={h.finalCta}>
        <div
          className={`${h.container} ${h.finalCtaInner}`}
        >
          <div>
            <p className={h.sectionEyebrow}>
              YOUR NEXT JOURNEY
            </p>

            <h2>
              {ctaSection?.heading ||
                "Ready when you are."}
            </h2>

            <p>
              {ctaSection?.description ||
                "Search RideGrid for your next local, airport or outstation journey."}
            </p>
          </div>

          <Link
            href="/#ride-search"
            className={h.primaryButton}
          >
            Find your ride
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>}

      <ContentBlocks
        blocks={chrome.blocks}
        placement="AFTER_CTA"
      />

      <ContentBlocks
        blocks={chrome.blocks}
        placement="AFTER_PRIMARY_CONTENT"
      />
    </PublicShell>
  );
}