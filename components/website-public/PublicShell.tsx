import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";
import type { PublicLink, PublicNavLink } from "@/lib/website-public/types";
import { WELLCABS } from "@/lib/website-public/brand";
import { LEGAL_LINKS } from "@/lib/website-public/info";
import { FOOTER_COLUMNS, PUBLIC_MENU } from "@/lib/website-public/navigation";
import PublicExperience from "./PublicExperience";
import PublicNavLinks from "./PublicNavLinks";
import s from "./PublicShell.module.css";

export function PublicAnchor({ link, className, children }: { link: PublicLink; className?: string; children?: ReactNode }) {
  return (
    <Link href={link.href} prefetch={false} className={className} target={link.newTab ? "_blank" : undefined} rel={link.newTab ? "noopener noreferrer" : undefined}>
      {children || link.label}
      {link.newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </Link>
  );
}

function Brand() {
  return (
    <Link href="/" className={s.brand} aria-label="RideGrid by Wellcabs home">
      <span className={s.brandMark} aria-hidden="true">R</span>
      <span className={s.brandCopy}>
        <strong>RideGrid</strong>
        <small>by Wellcabs</small>
      </span>
    </Link>
  );
}

// Desktop menu: a plain link per item, with a dropdown when PUBLIC_MENU has entries
// for that label. Opens on hover and keyboard focus (CSS :focus-within); no script.
function DesktopMenu({ links }: { links: PublicNavLink[] }) {
  return <ul className={s.menu}>{links.map((link) => {
    const children = PUBLIC_MENU[link.label];
    return <li key={`${link.href}-${link.label}`} className={children ? s.hasMenu : undefined}>
      <PublicNavLinks links={[link]} />
      {children && <>
        <ChevronDown size={13} aria-hidden="true" className={s.chevron} />
        <ul className={s.dropdown} aria-label={`${link.label} menu`}>
          {children.map((c) => <li key={c.href}><PublicAnchor link={c} /></li>)}
        </ul>
      </>}
    </li>;
  })}</ul>;
}

export function PublicHeader({ navigation }: { navigation: PublicNavLink[] }) {
  const links = navigation.filter((item) => item.location === "HEADER");
  return (
    <>
      <div className={s.utilityBar}>
        <div className={`${s.container} ${s.utilityInner}`}>
          <strong>Clean cars · Professional drivers · Transparent fares</strong>
          <nav aria-label="Utility" className={s.utilityLinks}>
            <a href={WELLCABS.phoneHref}><Phone size={12} aria-hidden="true" /> +91 {WELLCABS.phone}</a>
            <Link href="/contact" prefetch={false}>Support</Link>
            <Link href="/partners#drivers" prefetch={false}>Driver Login</Link>
            <Link href="/partners#vendors" prefetch={false}>Vendor / Partner Login</Link>
          </nav>
        </div>
      </div>

      <header className={s.header}>
        <div className={`${s.container} ${s.headerRow}`}>
          <Brand />

          <details className={s.mobileNav}>
            <summary aria-label="Open menu">Menu</summary>
            <div className={s.mobilePanel}>
              <nav aria-label="Mobile navigation">
                <PublicNavLinks links={links} />
                {!links.some((link) => link.href === "/contact") && <Link href="/contact">Contact & support</Link>}
                <Link href="/corporate-login" prefetch={false}>Corporate Login</Link>
                <Link href="/partners" prefetch={false}>Driver / Partner Login</Link>
                <Link href="/marketplace" className={s.mobileCta} aria-label="Find your ride - Book a Cab">
                  Book a Cab <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </nav>
            </div>
          </details>

          <nav aria-label="Main navigation" className={s.desktopNav}>
            <DesktopMenu links={links} />
          </nav>

          <div className={s.headerActions}>
            <a href={WELLCABS.whatsapp} className={s.mobileWhatsApp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Wellcabs (opens in a new tab)"><MessageCircle size={20} aria-hidden="true" /></a>
            <Link href="/marketplace" className={s.headerCta} aria-label="Find your ride - Book a Cab">
              Book a Cab
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function PublicFooter({ navigation }: { navigation: PublicNavLink[] }) {
  const primary = navigation.filter((item) => item.location === "FOOTER_PRIMARY");
  const secondary = navigation.filter((item) => item.location === "FOOTER_SECONDARY");
  const customLegal = navigation.filter((item) => item.location === "FOOTER_LEGAL");
  const legal = [...LEGAL_LINKS, ...customLegal.filter((link) => !LEGAL_LINKS.some((l) => l.href === link.href))];
  // Dashboard-configured footer links replace the matching default column.
  const columns = FOOTER_COLUMNS.map((c) => c.title === "Services" && primary.length ? { ...c, links: primary } : c.title === "Company & Support" && secondary.length ? { ...c, links: [...secondary, ...c.links.filter((l) => !secondary.some((x) => x.href === l.href))] } : c);

  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <Brand />
            <p className={s.footerLead}>Outstation, local, airport and corporate cab travel with verified vendors, verified drivers and transparent fares — booked on one connected marketplace.</p>
            <div className={s.footerContact}>
              <a href={WELLCABS.phoneHref}><Phone size={16} aria-hidden="true" />+91 {WELLCABS.phone}</a>
              <a href={WELLCABS.emailHref}><Mail size={16} aria-hidden="true" />{WELLCABS.email}</a>
              <a href={WELLCABS.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" />WhatsApp Wellcabs <span className="sr-only">(opens in a new tab)</span></a>
              <address>{WELLCABS.address}</address>
            </div>
          </div>
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title} className={s.footerNav}>
              <h2>{c.title}</h2>
              {c.links.map((link) => <PublicAnchor key={`${link.href}-${link.label}`} link={link} />)}
            </nav>
          ))}
        </div>
        <nav aria-label="Legal" className={s.legal}>
          {legal.map((link) => <PublicAnchor key={link.href} link={link} />)}
        </nav>
        <div className={s.footerBottom}>
          <span>© {new Date().getFullYear()} Wellcabs. RideGrid is the Wellcabs ground-mobility marketplace.</span>
          <span>RideGrid mobile apps are not yet available in app stores.</span>
        </div>
      </div>
    </footer>
  );
}

export default function PublicShell({ navigation, children, contentIsMain = false }: { navigation: PublicNavLink[]; children: ReactNode; contentIsMain?: boolean }) {
  return (
    <div className={s.site}>
      <a href="#public-main" className={s.skip}>Skip to content</a>
      <PublicHeader navigation={navigation} />
      {contentIsMain ? <div id="public-main" className={s.marketplaceContent}>{children}</div> : <main id="public-main">{children}</main>}
      <PublicFooter navigation={navigation} />
      <PublicExperience />
    </div>
  );
}
