import Link from "next/link";
import type { Metadata } from "next";
import { INFO_PAGES } from "@/lib/website-public/info";
import { WELLCABS } from "@/lib/website-public/brand";
import { resolvePhase1Chrome } from "@/lib/website-public/repository";
import PublicShell from "./PublicShell";
import s from "./InfoPage.module.css";
export function infoMetadata(slug: string): Metadata {
  const page = INFO_PAGES.find(p => p.slug === slug)!;
  const url = `https://www.wellcabs.com/${slug}`;
  return { title: page.title, description: page.description, alternates: { canonical: url }, robots: { index: !page.review, follow: true }, openGraph: { title: page.title, description: page.description, url, type: "website", images: [] }, twitter: { card: "summary", images: [] } };
}
function renderParagraph(text: string, linkifyEmail: boolean) {
  if (!linkifyEmail || !text.includes(WELLCABS.email)) return text;
  const [before, ...rest] = text.split(WELLCABS.email);
  return <>{before}<a href={WELLCABS.emailHref}>{WELLCABS.email}</a>{rest.join(WELLCABS.email)}</>;
}
export default async function InfoPage({ slug }: { slug: string }) {
  const page = INFO_PAGES.find(p => p.slug === slug)!;
  const chrome = await resolvePhase1Chrome();
  return <PublicShell navigation={chrome.navigation}><article className={s.page}>
    <header className={s.hero}><div className={s.container}><p className={s.eyebrow}>WELLCABS · GO PLACES. YOUR WAY.</p><h1>{page.title}</h1><p>{page.description}</p><Link href="/">Home</Link><span aria-hidden="true"> / </span><span>{page.title}</span></div></header>
    <div className={`${s.container} ${s.layout}`}><nav aria-label="On this page" className={s.contents}><strong>On this page</strong>{page.sections.map((section, i) => <a href={`#section-${i}`} key={section.heading}>{section.heading}</a>)}</nav>
      <div className={s.body}>{page.review && <aside className={s.review}><strong>Business and legal review pending</strong><p>This page provides information while the business verifies its legal details and final terms. Unconfirmed values are explicitly marked below. It does not claim legal compliance.</p></aside>}
        {page.sections.map((section, i) => <section id={`section-${i}`} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(p => <p key={p}>{renderParagraph(p, slug === "account-deletion")}</p>)}</section>)}
        <div className={s.actions}><Link href="/marketplace">Find a ride</Link><Link href="/contact">Contact information</Link>
          {slug === "account-deletion" && <><a href={WELLCABS.emailHref}>Email {WELLCABS.email}</a><Link href="/privacy-policy">Privacy Policy</Link></>}
        </div>
      </div>
    </div>
  </article></PublicShell>;
}
