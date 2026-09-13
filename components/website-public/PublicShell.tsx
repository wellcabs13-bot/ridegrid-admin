import Link from "next/link";
import type { ReactNode } from "react";

import type {
  PublicLink,
  PublicNavLink,
} from "@/lib/website-public/types";

import s from "./PublicShell.module.css";

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
      rel={link.newTab ? "noopener noreferrer" : undefined}
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
      aria-label="RideGrid by Wellcabs home"
    >
      <span
        className={s.brandMark}
        aria-hidden="true"
      >
        R
      </span>

      <span className={s.brandCopy}>
        <strong>RideGrid</strong>
        <small>BY WELLCABS</small>
      </span>
    </Link>
  );
}

export function PublicHeader({
  navigation,
}: {
  navigation: PublicNavLink[];
}) {
  const links = navigation.filter(
    (item) => item.location === "HEADER",
  );

  return (
    <>
      <div className={s.utilityBar}>
        <div className={s.container}>
          <div className={s.utilityInner}>
            <span>
              RIDEGRID · WELLCABS
            </span>

            <span>
              Ground mobility. One connected marketplace.
            </span>
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
            {links.map((link) => (
              <PublicAnchor
                key={`${link.location}-${link.href}-${link.label}`}
                link={link}
              />
            ))}
          </nav>

          <Link
            href="/#ride-search"
            className={s.headerCta}
          >
            Find your ride
            <span aria-hidden="true">→</span>
          </Link>

          <details className={s.mobileNav}>
            <summary>Menu</summary>

            <div className={s.mobilePanel}>
              <nav aria-label="Mobile navigation">
                {links.map((link) => (
                  <PublicAnchor
                    key={`mobile-${link.location}-${link.href}-${link.label}`}
                    link={link}
                  />
                ))}

                <Link
                  href="/#ride-search"
                  className={s.mobileCta}
                >
                  Find your ride →
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
  const groups = [
    ["FOOTER_PRIMARY", "Explore"],
    ["SERVICES", "Services"],
    ["PLACES", "Cities / Routes"],
    ["FOOTER_SECONDARY", "Information"],
    ["FOOTER_LEGAL", "Legal"],
  ] as const;

  return (
    <footer className={s.footer}>
      <div className={s.footerAccent} />

      <div className={s.container}>
        <div className={s.footerGrid}>
          <div>
            <Brand />

            <p className={s.footerLead}>
              Search, compare and book ground
              transportation through RideGrid by
              Wellcabs.
            </p>

            <Link
              href="/#ride-search"
              className={s.footerCta}
            >
              Find your ride →
            </Link>
          </div>

          {groups.map(([location, title]) => {
            const links = navigation.filter(
              (item) =>
                location === "SERVICES" ? item.location === "FOOTER_PRIMARY" && item.href.startsWith("/services/") :
                location === "PLACES" ? item.location === "FOOTER_PRIMARY" && /^\/(cities|routes)\//.test(item.href) :
                item.location === location && (location !== "FOOTER_PRIMARY" || !/^\/(services|cities|routes)\//.test(item.href)),
            );

            if (!links.length) {
              return null;
            }

            return (
              <nav
                key={location}
                aria-label={title}
                className={s.footerNav}
              >
                <h2>{title}</h2>

                {links.map((link) => (
                  <PublicAnchor
                    key={`${location}-${link.href}-${link.label}`}
                    link={link}
                  />
                ))}
              </nav>
            );
          })}
        </div>

        <div className={s.footerBottom}>
          <span>
            © {new Date().getFullYear()} RideGrid
            by Wellcabs.
          </span>

          <span>
            Your journey. Your choice.
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

      <PublicHeader navigation={navigation} />

      {contentIsMain ? (
        <div id="public-main">
          {children}
        </div>
      ) : (
        <main id="public-main">
          {children}
        </main>
      )}

      <PublicFooter navigation={navigation} />
    </div>
  );
}