import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, ClipboardCheck, FileText, Smartphone, Users, Wallet } from "lucide-react";
import PublicShell from "@/components/website-public/PublicShell";
import CorporateEnquiryForm from "@/components/website-public/CorporateEnquiryForm";
import { Hero } from "@/components/website-public/Content";
import s from "@/components/website-public/public.module.css";
import { WELLCABS } from "@/lib/website-public/brand";
import { resolvePhase1Chrome } from "@/lib/website-public/repository";

const canonical = "https://www.wellcabs.com/corporate-travel";
export const metadata: Metadata = {
  title: "Corporate Car Rental & Employee Transportation",
  description: "Corporate car rental and employee travel with Wellcabs: travel policies, approval workflows, budgets, corporate credit and consolidated monthly invoices on the RideGrid corporate portal.",
  alternates: { canonical },
  openGraph: { title: "Corporate travel with RideGrid by Wellcabs", url: canonical, type: "website" },
};
export const dynamic = "force-dynamic";

const FEATURES = [
  { Icon: ClipboardCheck, title: "Travel policy", body: "Allowed trip types, vehicle categories, amounts, cities and hours — for the whole company, a branch, a department or one employee." },
  { Icon: Users, title: "Approval workflows", body: "Route requests to the department head, reporting manager or your travel desk, one or several steps in order." },
  { Icon: Wallet, title: "Budgets and corporate credit", body: "Company, branch, department and employee budgets checked on every booking, paid from your corporate credit." },
  { Icon: FileText, title: "Centralised billing", body: "One invoice per completed trip, GST-ready, downloadable individually or in bulk, with branch and department reports." },
];

export default async function CorporateTravelPage() {
  const chrome = await resolvePhase1Chrome();
  return <PublicShell navigation={chrome.navigation}>
    <Hero title="Corporate travel, under control." eyebrow="Corporate car rental" description="Business travel and employee mobility on one account: your employees book verified cars and drivers in the RideGrid app, your policies and approvals apply automatically, and you receive one consolidated bill." links={[{ label: "Get Corporate Quote", href: "#enquiry" }, { label: "Corporate Login", href: "/corporate-login" }]} breadcrumbs={[{ label: "Home", href: "/" }, { label: "Corporate travel", href: "/corporate-travel" }]} />
    <section className={s.section}><div className={s.container}>
      <p className={s.eyebrow}>What your company gets</p>
      <h2>Everything a travel desk needs.</h2>
      <div className={s.grid}>{FEATURES.map(({ Icon, title, body }) => <article key={title} className={s.card}><Icon size={26} aria-hidden="true" color="#e11d2e" /><h3>{title}</h3><p>{body}</p></article>)}</div>
    </div></section>
    <section id="employee-transport" className={`${s.section} ${s.marketplace}`}><div className={`${s.container} ${s.marketplaceGrid}`}>
      <div>
        <p className={s.eyebrow}>Employee transportation</p>
        <h2>Employees book. You stay in control.</h2>
        <p className={s.sectionIntro}>Employees search the same live RideGrid marketplace, pick the exact car and driver, and book on corporate credit. Trips outside policy go to the right approver first.</p>
      </div>
      <div className={s.steps}>{[
        { Icon: Smartphone, title: "Employee searches", body: "Outstation, round trip, local or airport, in the RideGrid Corporate Employee App." },
        { Icon: BadgeCheck, title: "Policy and budget check", body: "Allowed trips book immediately; others go to approval." },
        { Icon: Building2, title: "Billed to your company", body: "Corporate credit, invoices and reports in your Corporate Portal." },
      ].map(({ Icon, title, body }) => <div key={title} className={s.step}><span className={s.stepIcon}><Icon size={20} aria-hidden="true" /></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div>
    </div></section>
    <section className={s.section}><div className={s.container}>
      <div className={s.grid}>
        <article className={s.card}><span className={s.tag}>New to Wellcabs</span><h3>Talk to our corporate team</h3><p>Tell us about your travel needs and we will set up your company account, policies and credit terms.</p><a href="#enquiry" className={s.cardLink}>Get a corporate quote <span aria-hidden="true">↗</span></a></article>
        <article className={s.card}><span className={s.tag}>Existing client</span><h3>Corporate Portal</h3><p>Travel administrators manage employees, approvals, budgets, invoices and reports.</p><Link href="/corporate-login" className={s.cardLink}>Corporate Login <span aria-hidden="true">↗</span></Link></article>
        <article className={s.card}><span className={s.tag}>Employees</span><h3>RideGrid Corporate Employee App</h3><p>Sign in with the company email your travel administrator registered. Ask them if you do not have access yet.</p><a href={WELLCABS.whatsapp} target="_blank" rel="noopener noreferrer" className={s.cardLink}>Need help? WhatsApp us <span aria-hidden="true">↗</span></a></article>
      </div>
    </div></section>
    <section id="enquiry" className={s.section}><div className={s.container}>
      <p className={s.eyebrow}>Corporate enquiry</p>
      <h2>Get a corporate quote.</h2>
      <p className={s.sectionIntro}>Or call <a href={WELLCABS.phoneHref} className="font-semibold underline">+91 {WELLCABS.phone}</a> · <a href={`${WELLCABS.emailHref}?subject=Corporate%20travel%20enquiry`} className="font-semibold underline">{WELLCABS.email}</a></p>
      <CorporateEnquiryForm />
      <p className={s.muted} style={{ marginTop: 16 }}><Link href="/business-travel-terms" className="underline">Business travel information <ArrowUpRight size={14} className="inline" aria-hidden="true" /></Link></p>
    </div></section>
  </PublicShell>;
}
