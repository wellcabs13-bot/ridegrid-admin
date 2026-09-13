import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Building2,
  CarFront,
  Check,
  Headphones,
  MapPinned,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import type {
  resolveHomepage,
} from "@/lib/website-public/homepage";

import {
  ContentBlocks,
} from "./Content";

import HeroSearch
  from "./HeroSearch";

import HomepageMarketplaceRoutes
  from "./HomepageMarketplaceRoutes";

import PublicShell
  from "./PublicShell";

import h
  from "./HomepagePremium.module.css";

export default function Homepage({
  page,
}: {
  page: Awaited<
    ReturnType<
      typeof resolveHomepage
    >
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
      (item) =>
        item.category ===
        "HERO",
    )?.asset ?? null;

  const searchSection =
    sections.find(
      (section) =>
        section.type ===
        "SEARCH",
    );

  const routesSection =
    sections.find(
      (section) =>
        section.type ===
        "ROUTES",
    );

  const marketplaceSection =
    sections.find(
      (section) =>
        section.type ===
        "MARKETPLACE",
    );

  const ctaSection =
    sections.find(
      (section) =>
        section.type ===
        "CTA",
    );

  const heroSection =
    sections.find(
      (section) =>
        section.type ===
        "HERO",
    );

  const contentSections =
    sections.filter(
      (section) =>
        section.type ===
          "CONTENT" &&
        (
          section.heading ||
          section.description
        ),
    );

  return (
    <PublicShell
      navigation={
        chrome.navigation
      }
    >
      <ContentBlocks
        blocks={chrome.blocks}
        placement="BEFORE_PRIMARY_CONTENT"
      />

      {!heroSection && (
        <h1 className="sr-only">
          {hero.title ||
            "RideGrid by Wellcabs"}
        </h1>
      )}

      {heroSection && (
        <section
          className={h.hero}
        >
          <div
            className={
              h.heroBackdrop
            }
          >
            {heroMedia ? (
              <Image
                src={
                  heroMedia.src
                }
                alt={
                  heroMedia.alt
                }
                fill
                priority
                unoptimized
                sizes="100vw"
                className={
                  h.heroBackgroundImage
                }
              />
            ) : (
              <div
                className={
                  h.roadVisual
                }
                aria-hidden="true"
              >
                <div
                  className={
                    h.roadLane
                  }
                />

                <CarFront
                  className={
                    h.fallbackCar
                  }
                />
              </div>
            )}

            <div
              className={
                h.heroShade
              }
            />
          </div>

          <div
            className={
              h.container
            }
          >
            <div
              className={
                h.heroContent
              }
            >
              <p
                className={
                  h.eyebrow
                }
              >
                OUTSTATION  /  LOCAL  /
                AIRPORT  /  CORPORATE
              </p>

              <h1>
                {hero.title ||
                  "Travel Further With Confidence"}
              </h1>

              <p
                className={
                  h.heroDescription
                }
              >
                {hero.subtitle ||
                  "Search current rides for outstation, local, airport and business travel through RideGrid by Wellcabs."}
              </p>

              <div
                className={
                  h.heroSignals
                }
              >
                <span>
                  <ShieldCheck
                    size={17}
                  />
                  Connected booking
                </span>

                <span>
                  <CarFront
                    size={17}
                  />
                  Marketplace options
                </span>

                <span>
                  <Headphones
                    size={17}
                  />
                  Ride support
                </span>
              </div>

              <div
                className={
                  h.heroActions
                }
              >
                <Link
                  href="/#ride-search"
                  className={
                    h.primaryButton
                  }
                >
                  Book a Cab
                  <ArrowRight
                    size={17}
                  />
                </Link>

                <Link
                  href="/#services"
                  className={
                    h.secondaryButton
                  }
                >
                  Explore services
                  <ArrowRight
                    size={17}
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {searchSection && (
        <section
          className={
            h.searchStage
          }
        >
          <HeroSearch
            heading={
              searchSection.heading ||
              "Where are we taking you?"
            }
            description={
              searchSection.description ||
              "Choose your journey and search current RideGrid vehicle options."
            }
          />
        </section>
      )}

      <section
        className={
          h.assurance
        }
      >
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
                Search to booking in
                one flow
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
                Marketplace-powered
                availability
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
                Local, airport and
                outstation
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
                Corporate workflows
                integrated
              </small>
            </span>
          </div>
        </div>
      </section>

      {routesSection && (
        <HomepageMarketplaceRoutes />
      )}

      <section
        id="services"
        className={h.section}
      >
        <div
          className={
            h.container
          }
        >
          <div
            className={
              h.sectionHeading
            }
          >
            <div>
              <p
                className={
                  h.sectionEyebrow
                }
              >
                OUR SERVICES
              </p>

              <h2>
                One platform for every
                road journey.
              </h2>
            </div>

            <Link
              href="/#ride-search"
              className={
                h.textLink
              }
            >
              Book a cab
              <ArrowRight
                size={16}
              />
            </Link>
          </div>

          <div
            className={
              h.serviceGrid
            }
          >
            <article
              id="outstation"
              className={
                h.serviceCard
              }
            >
              <span
                className={
                  h.iconBox
                }
              >
                <Route />
              </span>

              <div>
                <p>
                  OUTSTATION
                </p>

                <h3>
                  One Way & Round Trip
                </h3>

                <span>
                  Search intercity
                  journeys using current
                  RideGrid marketplace
                  options.
                </span>
              </div>

              <Link href="/#ride-search">
                Explore Outstation
                <ArrowRight
                  size={15}
                />
              </Link>
            </article>

            <article
              id="local-cabs"
              className={
                h.serviceCard
              }
            >
              <span
                className={
                  h.iconBox
                }
              >
                <MapPinned />
              </span>

              <div>
                <p>
                  LOCAL
                </p>

                <h3>
                  Local Cab Service
                </h3>

                <span>
                  Search available local
                  packages and vehicle
                  categories.
                </span>
              </div>

              <Link href="/#ride-search">
                Book Local Cab
                <ArrowRight
                  size={15}
                />
              </Link>
            </article>

            <article
              id="airport-transfers"
              className={
                h.serviceCard
              }
            >
              <span
                className={
                  h.iconBox
                }
              >
                <Plane />
              </span>

              <div>
                <p>
                  AIRPORT
                </p>

                <h3>
                  Airport Transfers
                </h3>

                <span>
                  Search configured
                  airport pickup and drop
                  journey options.
                </span>
              </div>

              <Link href="/#ride-search">
                Book Airport Cab
                <ArrowRight
                  size={15}
                />
              </Link>
            </article>

            <article
              id="corporate"
              className={
                h.serviceCard
              }
            >
              <span
                className={
                  h.iconBox
                }
              >
                <Building2 />
              </span>

              <div>
                <p>
                  CORPORATE
                </p>

                <h3>
                  Business Mobility
                </h3>

                <span>
                  RideGrid connects
                  corporate travel with
                  the same operational
                  platform.
                </span>
              </div>

              <Link href="/#corporate-mobility">
                Explore Corporate
                <ArrowRight
                  size={15}
                />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section
        className={
          h.trustSection
        }
      >
        <div
          className={
            h.container
          }
        >
          <div
            className={
              h.sectionHeading
            }
          >
            <div>
              <p
                className={
                  h.sectionEyebrow
                }
              >
                WHY RIDEGRID
              </p>

              <h2>
                Built around choice,
                visibility and connected
                operations.
              </h2>
            </div>
          </div>

          <div
            className={
              h.trustGrid
            }
          >
            <div>
              <ShieldCheck />
              <strong>
                Connected workflow
              </strong>
              <span>
                Search, booking and
                payment remain connected.
              </span>
            </div>

            <div>
              <CarFront />
              <strong>
                Real marketplace
              </strong>
              <span>
                Vehicle choices come
                from RideGrid
                configuration.
              </span>
            </div>

            <div>
              <MapPinned />
              <strong>
                Journey coverage
              </strong>
              <span>
                Outstation, airport,
                local and rental flows.
              </span>
            </div>

            <div>
              <Sparkles />
              <strong>
                Smarter platform
              </strong>
              <span>
                Website and operations
                share one RideGrid core.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="corporate-mobility"
        className={
          h.corporateSection
        }
      >
        <div
          className={`${h.container} ${h.corporateGrid}`}
        >
          <div>
            <p
              className={
                h.sectionEyebrow
              }
            >
              NEED BUSINESS MOBILITY?
            </p>

            <h2>
              Corporate & Employee
              Transportation
            </h2>

            <p>
              RideGrid brings business
              travel, approvals,
              mobility operations and
              booking workflows into
              one connected platform.
            </p>

            <Link
              href="/#ride-search"
              className={
                h.primaryButton
              }
            >
              Explore RideGrid
              <ArrowRight
                size={17}
              />
            </Link>
          </div>

          <div
            className={
              h.corporateVisual
            }
            aria-hidden="true"
          >
            <Users size={72} />
            <CarFront size={110} />
            <Building2 size={82} />
          </div>
        </div>
      </section>

      {marketplaceSection && (
        <section
          className={
            h.marketplace
          }
        >
          <div
            className={`${h.container} ${h.marketplaceGrid}`}
          >
            <div>
              <p
                className={
                  h.sectionEyebrow
                }
              >
                RIDEGRID MARKETPLACE
              </p>

              <h2>
                {marketplaceSection.heading ||
                  "Find the right ride for your plans."}
              </h2>

              <p>
                {marketplaceSection.description ||
                  "Search your journey details to see current RideGrid vehicle options."}
              </p>

              <Link
                href="/marketplace"
                className={
                  h.primaryButton
                }
              >
                Search now
                <ArrowRight
                  size={17}
                />
              </Link>
            </div>

            <div
              className={
                h.marketplacePanel
              }
            >
              <div>
                <Sparkles
                  size={21}
                />

                <strong>
                  Search once
                </strong>

                <span>
                  Enter your journey
                  details.
                </span>
              </div>

              <div>
                <CarFront
                  size={21}
                />

                <strong>
                  Compare options
                </strong>

                <span>
                  Review current
                  marketplace vehicles.
                </span>
              </div>

              <div>
                <ShieldCheck
                  size={21}
                />

                <strong>
                  Continue securely
                </strong>

                <span>
                  Move through booking
                  and payment.
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {discovery.length > 0 && (
        <section
          id="discover"
          className={`${h.section} ${h.softSection}`}
        >
          <div
            className={
              h.container
            }
          >
            <div
              className={
                h.sectionHeading
              }
            >
              <div>
                <p
                  className={
                    h.sectionEyebrow
                  }
                >
                  DISCOVER
                </p>

                <h2>
                  Published RideGrid
                  journeys & places
                </h2>
              </div>
            </div>

            <div
              className={
                h.discoveryGrid
              }
            >
              {discovery
                .slice(0, 6)
                .map((item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className={
                      h.discoveryCard
                    }
                  >
                    <div>
                      <span>
                        {item.type}
                      </span>

                      <h3>
                        {item.label}
                      </h3>

                      <p>
                        {
                          item.description
                        }
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

      <section
        id="travel-guides"
        className={
          h.guideSection
        }
      >
        <div
          className={
            h.container
          }
        >
          <div
            className={
              h.guidePanel
            }
          >
            <div>
              <p
                className={
                  h.sectionEyebrow
                }
              >
                TRAVEL GUIDES
              </p>

              <h2>
                Plan smarter journeys
                with RideGrid.
              </h2>

              <p>
                Route, city and travel
                content published from
                Website & SEO will
                automatically become
                discoverable across the
                public site.
              </p>
            </div>

            <Link
              href="/#ride-search"
              className={
                h.primaryButton
              }
            >
              Start a Journey
              <ArrowRight
                size={17}
              />
            </Link>
          </div>
        </div>
      </section>

      {contentSections.map(
        (section) => (
          <section
            key={section.id}
            className={
              h.editorialSection
            }
          >
            <div
              className={
                h.container
              }
            >
              <p
                className={
                  h.sectionEyebrow
                }
              >
                WELLCABS  /  RIDEGRID
              </p>

              {section.heading && (
                <h2>
                  {section.heading}
                </h2>
              )}

              {section.description && (
                <p>
                  {
                    section.description
                  }
                </p>
              )}
            </div>
          </section>
        ),
      )}

      <section
        id="about"
        className={
          h.aboutSection
        }
      >
        <div
          className={`${h.container} ${h.aboutGrid}`}
        >
          <div>
            <p
              className={
                h.sectionEyebrow
              }
            >
              RIDEGRID  /  WELLCABS
            </p>

            <h2>
              Ground mobility,
              connected.
            </h2>
          </div>

          <p>
            RideGrid connects the
            customer website with the
            same marketplace, booking
            and mobility platform used
            across Wellcabs operations.
          </p>
        </div>
      </section>

      <ContentBlocks
        blocks={chrome.blocks}
        placement="BEFORE_CTA"
      />

      {ctaSection && (
        <section
          className={
            h.finalCta
          }
        >
          <div
            className={`${h.container} ${h.finalCtaInner}`}
          >
            <div>
              <p
                className={
                  h.sectionEyebrow
                }
              >
                READY FOR YOUR NEXT
                JOURNEY?
              </p>

              <h2>
                {ctaSection.heading ||
                  "Book with RideGrid."}
              </h2>

              <p>
                {ctaSection.description ||
                  "Search current RideGrid options and continue through the connected booking flow."}
              </p>
            </div>

            <Link
              href="/#ride-search"
              className={
                h.primaryButton
              }
            >
              Book a Cab Now
              <ArrowRight
                size={17}
              />
            </Link>
          </div>
        </section>
      )}

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
