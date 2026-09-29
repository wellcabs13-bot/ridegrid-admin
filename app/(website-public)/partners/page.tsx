import type { Metadata } from "next";
import { Car, MessageCircle, Phone, UserRound } from "lucide-react";
import PublicShell from "@/components/website-public/PublicShell";
import { Hero } from "@/components/website-public/Content";
import s from "@/components/website-public/public.module.css";
import { WELLCABS, whatsappLink } from "@/lib/website-public/brand";
import { publicNavigation } from "@/lib/website-public/navigation";
import { websitePublicNavigationRepository } from "@/lib/website-seo/public-navigation/repository";

export const metadata: Metadata = {
  title: "Driver and Vendor Partner Login",
  description: "How RideGrid drivers and fleet vendor partners sign in, and how to join Wellcabs as a partner.",
  alternates: { canonical: "https://www.wellcabs.com/partners" },
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

// Drivers and vendors use the RideGrid Driver and Vendor apps; there is no web login
// for them. This page says so plainly and routes partners to real contact channels.
export default async function PartnersPage() {
  const nav = await websitePublicNavigationRepository.list().catch(() => ({ items: [], configured: false }));
  return <PublicShell navigation={publicNavigation(nav.items, nav.configured)}>
    <Hero compact title="Driver and partner login" eyebrow="RideGrid partners" description="RideGrid drivers and fleet vendors sign in through the RideGrid mobile apps, not this website. The apps are provided to verified partners by Wellcabs and are not yet listed in app stores." breadcrumbs={[{ label: "Home", href: "/" }, { label: "Partners", href: "/partners" }]} />
    <section className={s.section}><div className={`${s.container} ${s.grid}`}>
      <article id="drivers" className={s.card}><UserRound size={26} aria-hidden="true" color="#e11d2e" /><h3>Drivers</h3><p>Sign in to the RideGrid Driver App with the mobile number your vendor registered. Trips, navigation and trip status updates happen in the app.</p><a className={s.cardLink} href={whatsappLink("Hello Wellcabs, I am a driver and need help signing in to the RideGrid Driver App.")} target="_blank" rel="noopener noreferrer">Driver help on WhatsApp <span aria-hidden="true">↗</span></a></article>
      <article id="vendors" className={s.card}><Car size={26} aria-hidden="true" color="#e11d2e" /><h3>Vendors and fleet partners</h3><p>Manage your vehicles, drivers, documents, bookings and payouts in the RideGrid Vendor App after RideGrid verifies your account.</p><a className={s.cardLink} href={whatsappLink("Hello Wellcabs, I would like to list my vehicles on RideGrid as a vendor partner.")} target="_blank" rel="noopener noreferrer">Become a vendor partner <span aria-hidden="true">↗</span></a></article>
      <article className={s.card}><MessageCircle size={26} aria-hidden="true" color="#e11d2e" /><h3>Partner support</h3><p>For access, onboarding or verification questions, contact the Wellcabs partner team.</p><a className={s.cardLink} href={WELLCABS.phoneHref}><span className="inline-flex items-center gap-2"><Phone size={15} aria-hidden="true" /> +91 {WELLCABS.phone}</span> <span aria-hidden="true">↗</span></a></article>
    </div></section>
  </PublicShell>;
}
