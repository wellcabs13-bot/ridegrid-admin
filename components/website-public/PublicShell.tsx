import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicNavLink, PublicLink } from "@/lib/website-public/types";
import s from "./public.module.css";
export function PublicAnchor({ link, className, children }: { link: PublicLink; className?: string; children?: ReactNode }) {
  return <Link href={link.href} prefetch={false} className={className} target={link.newTab ? "_blank" : undefined} rel={link.newTab ? "noopener noreferrer" : undefined}>{children || link.label}{link.newTab && <span className="sr-only"> (opens in a new tab)</span>}</Link>;
}
function Brand() { return <Link href="/" className={s.brand} aria-label="RideGrid home"><span className={s.brandMark} aria-hidden="true">R</span><span>RideGrid<small>By Wellcabs</small></span></Link>; }
export function PublicHeader({ navigation }: { navigation: PublicNavLink[] }) {
  const links = navigation.filter(n => n.location === "HEADER");
  return <header className={s.header}><div className={`${s.container} ${s.headerRow}`}><Brand /><nav aria-label="Main navigation" className={s.desktopNav}>{links.map((link, i) => <PublicAnchor key={i} link={link} />)}</nav><Link href="/marketplace" className={s.button}>Find your ride <span aria-hidden="true">↗</span></Link><details className={s.mobileNav}><summary>Menu</summary><nav aria-label="Mobile navigation">{links.map((link, i) => <PublicAnchor key={i} link={link} />)}<Link href="/marketplace" className={s.button}>Find your ride ↗</Link></nav></details></div></header>;
}
export function PublicFooter({ navigation }: { navigation: PublicNavLink[] }) {
  return <footer className={s.footer}><div className={s.container}><div className={s.footerGrid}><div><Brand /><p className={s.muted} style={{ maxWidth: 270, marginTop: 20 }}>Your car. Your price. Your choice.<br />Find your next journey with RideGrid.</p></div>{([['FOOTER_PRIMARY', 'Explore'], ['FOOTER_SECONDARY', 'Information'], ['FOOTER_LEGAL', 'Legal']] as const).map(([location, title]) => {
    const links = navigation.filter(n => n.location === location); return links.length ? <nav key={location} aria-label={title}><h2>{title}</h2>{links.map((link, i) => <PublicAnchor key={i} link={link} />)}</nav> : null;
  })}</div><div className={s.footerBottom}><span>© {new Date().getFullYear()} RideGrid / Wellcabs.</span><span>From the everyday to the open road.</span></div></div></footer>;
}
export default function PublicShell({ navigation, children, contentIsMain = false }: { navigation: PublicNavLink[]; children: ReactNode; contentIsMain?: boolean }) {
  return <div className={s.site}><a href="#public-main" className={s.skip}>Skip to content</a><PublicHeader navigation={navigation} />{contentIsMain ? <div id="public-main">{children}</div> : <main id="public-main">{children}</main>}<PublicFooter navigation={navigation} /></div>;
}
