import Link from "next/link";
import type { ReactNode } from "react";

import type {
  PublicLink,
  PublicNavLink,
} from "@/lib/website-public/types";

import s from "./PublicShell.module.css";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { WELLCABS } from "@/lib/website-public/brand";
import PublicExperience from "./PublicExperience";
import { LEGAL_LINKS } from "@/lib/website-public/info";
import PublicNavLinks from "./PublicNavLinks";

export function PublicAnchor({
  link,
  className,
  children,
}: {
  link: PublicLink;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={link.href}
      prefetch={false}
      className={className}
      target={link.newTab ? "_blank" : undefined}
      rel={
        link.newTab
          ? "noopener noreferrer"
          : undefined
      }
    >
      {children || link.label}

      {link.newTab && (
        <span className="sr-only">
          {" "}
          (opens in a new tab)
        </span>
      )}
    </Link>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className={s.brand}
      aria-label="Wellcabs home"
    >
      <span
        className={s.brandMark}
        aria-hidden="true"
      >
        W
      </span>

      <span className={s.brandCopy}>
        <strong>Wellcabs<span className={s.brandDot}>.</span></strong>
        <small>GO PLACES. YOUR WAY.</small>
      </span>
    </Link>
  );
}

export function PublicHeader({
  navigation,
}: {
  navigation: PublicNavLink[];
}) {
  const links =
    navigation.filter(
      (item) =>
        item.location === "HEADER",
    );

  return (
    <>
      <div className={s.utilityBar}>
        <div className={s.container}>
          <div className={s.utilityInner}>
            <strong>
              Your next journey starts here.
            </strong>

            <a href={WELLCABS.phoneHref}><Phone size={12} aria-hidden="true"/> {WELLCABS.phone}</a>
          </div>
        </div>
      </div>

      <header className={s.header}>
        <div
          className={`${s.container} ${s.headerRow}`}
        >
          <Brand />

          <nav
            aria-label="Main navigation"
            className={s.desktopNav}
          >
            <PublicNavLinks links={links} />
            {!links.some(link=>link.href==="/contact") && <Link href="/contact">Contact</Link>}
          </nav>

          <Link
            href="/#ride-search"
            className={s.headerCta} aria-label="Find your ride - Book a Cab"
          >
            Book a Cab
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <a href={WELLCABS.whatsapp} className={s.mobileWhatsApp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Wellcabs (opens in a new tab)"><MessageCircle size={21} aria-hidden="true"/></a>

          <details className={s.mobileNav}>
            <summary>
              Menu
            </summary>

            <div className={s.mobilePanel}>
              <nav aria-label="Mobile navigation">
                <PublicNavLinks links={links} />
                {!links.some(link=>link.href==="/contact") && <Link href="/contact">Contact & support</Link>}

                <Link
                  href="/#ride-search"
                  className={s.mobileCta} aria-label="Find your ride - Book a Cab"
                >
                  Book a Cab <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </header>
    </>
  );
}

export function PublicFooter({
  navigation,
}: {
  navigation: PublicNavLink[];
}) {
  const primary =
    navigation.filter(
      (item) =>
        item.location ===
        "FOOTER_PRIMARY",
    );

  const secondary =
    navigation.filter(
      (item) =>
        item.location ===
        "FOOTER_SECONDARY",
    );

  const customLegal =
    navigation.filter(
      (item) =>
        item.location ===
        "FOOTER_LEGAL",
    );
  const legal = [...LEGAL_LINKS, ...customLegal.filter(link => !LEGAL_LINKS.some(l => l.href === link.href))];

  return (
    <footer className={s.footer}>
      <div className={s.footerAccent} />

      <div className={s.container}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <Brand />

            <p className={s.footerLead}>
              One connected marketplace for
              outstation, local, airport and
              business ground transportation.
            </p>

            <Link
              href="/#ride-search"
              className={s.footerCta} aria-label="Find your ride - Book a Cab"
            >
              Book a Cab <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className={s.footerContact}>
            <p>LET’S GET YOU THERE.</p>
            <a href={WELLCABS.phoneHref}><Phone size={18} aria-hidden="true"/>{WELLCABS.phone}</a>
            <a href={WELLCABS.emailHref}><Mail size={18} aria-hidden="true"/>{WELLCABS.email}</a>
            <a href={WELLCABS.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true"/>WhatsApp Wellcabs <span className="sr-only">(opens in a new tab)</span></a>
            <address>{WELLCABS.address}</address>
          </div>

          {primary.length > 0 && (
            <nav
              aria-label="Ride services"
              className={s.footerNav}
            >
              <h2>
                Cab Services
              </h2>

              {primary.map((link) => (
                <PublicAnchor
                  key={link.href}
                  link={link.label === "About RideGrid" ? { ...link, label: "About Wellcabs" } : link}
                />
              ))}
            </nav>
          )}

          {(
            <nav
              aria-label="Information"
              className={s.footerNav}
            >
              <h2>
                Explore
              </h2>
              <Link href="/about">About us</Link>
              <Link href="/contact">Contact us</Link>

              {secondary.map((link) => (
                <PublicAnchor
                  key={link.href}
                  link={link.label === "About RideGrid" ? { ...link, label: "About Wellcabs" } : link}
                />
              ))}
            </nav>
          )}

          {legal.length > 0 && (
            <nav
              aria-label="Legal"
              className={s.footerNav}
            >
              <h2>
                Legal
              </h2>

              {legal.map((link) => (
                <PublicAnchor
                  key={link.href}
                  link={link}
                />
              ))}
            </nav>
          )}
        </div>

        <div className={s.footerBottom}>
          <span>
            (c) {new Date().getFullYear()}{" "}
            Wellcabs. All rights reserved.
          </span>

          <span>
            Reliable rides. A smarter
            tomorrow.
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function PublicShell({
  navigation,
  children,
  contentIsMain = false,
}: {
  navigation: PublicNavLink[];
  children: ReactNode;
  contentIsMain?: boolean;
}) {
  return (
    <div className={s.site}>
      <a
        href="#public-main"
        className={s.skip}
      >
        Skip to content
      </a>

      <PublicHeader
        navigation={navigation}
      />

      {contentIsMain ? (
        <div id="public-main" className={s.marketplaceContent}>
          {children}
        </div>
      ) : (
        <main id="public-main">
          {children}
        </main>
      )}

      <PublicFooter
        navigation={navigation}
      />
      <PublicExperience/>
    </div>
  );
}
