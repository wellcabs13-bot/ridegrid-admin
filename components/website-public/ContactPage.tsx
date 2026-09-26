import Link from "next/link";
import { ArrowUpRight, Building2, CarFront, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { WELLCABS } from "@/lib/website-public/brand";
import type { PublicNavLink } from "@/lib/website-public/types";
import PublicShell from "./PublicShell";
import s from "./Premium.module.css";

export default function ContactPage({ navigation }: { navigation: PublicNavLink[] }) {
  return <PublicShell navigation={navigation}>
    <section className={s.contactHero}><div className={s.container}>
      <p className={s.eyebrow}>WELLCABS · HERE TO HELP</p>
      <h1>Good journeys begin<br/>with <span>a conversation.</span></h1>
      <p className={s.lead}>A ride to plan. A booking to check. A question before you go. Reach the Wellcabs team your way.</p>
      <div className={s.actions}><a href={WELLCABS.phoneHref} className={s.button}><Phone size={18} aria-hidden="true"/> Call us</a><Link href="/#ride-search" className={`${s.button} ${s.secondary}`}>Find a cab <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </div></section>
    <div className={s.container}><div className={s.contactGrid}>
      <section className={s.whatsappCard} aria-labelledby="whatsapp-heading"><MessageCircle aria-hidden="true"/><p className={`${s.eyebrow} mt-6`}>LET’S TALK TRAVEL</p><h2 id="whatsapp-heading">Your next ride.<br/>One message away.</h2><p>Tell us where you’re headed. Share your travel plans or booking reference, and start a conversation with Wellcabs on WhatsApp.</p><a href={WELLCABS.whatsapp} className={s.button} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Wellcabs on +91 9011079304 (opens in a new tab)">WhatsApp us <ArrowUpRight size={20} aria-hidden="true"/></a><p className="mt-5 text-sm">+91 {WELLCABS.phone}</p></section>
      <div className={s.contactMethods}><a href={WELLCABS.phoneHref} className={s.contactMethod}><Phone size={26} aria-hidden="true"/><div><h2>Prefer a conversation?</h2><strong>{WELLCABS.phone}</strong><p>Tap to call the Wellcabs team.</p></div></a><a href={WELLCABS.emailHref} className={s.contactMethod}><Mail size={26} aria-hidden="true"/><div><h2>Put it in an email</h2><strong>{WELLCABS.email}</strong><p>For journey details, booking questions and business enquiries.</p></div></a></div>
    </div></div>
    <section className={s.section}><div className={s.container}><p className={s.eyebrow}>A LITTLE DIRECTION</p><h2 className={s.heading}>How can we help you move?</h2><div className={s.supportGrid}>
      <article className={s.supportCard} data-reveal><CarFront aria-hidden="true"/><h3>Let’s plan your ride</h3><p>Explore current cabs for local travel, airport transfers or your next outstation journey.</p><Link href="/#ride-search">Start with your journey <ArrowUpRight size={17}/></Link></article>
      <article className={s.supportCard} data-reveal><ShieldCheck aria-hidden="true"/><h3>Help with a booking</h3><p>Keep your booking reference and travel date handy so we can understand your request. Never share an OTP or payment password.</p><a href={WELLCABS.emailHref}>Contact booking support <ArrowUpRight size={17}/></a></article>
      <article className={s.supportCard} data-reveal><Building2 aria-hidden="true"/><h3>Travel for your business</h3><p>Speak with us about your team’s travel needs, corporate enquiries or working with Wellcabs.</p><a href={`${WELLCABS.emailHref}?subject=Wellcabs%20business%20travel%20enquiry`}>Discuss business travel <ArrowUpRight size={17}/></a></article>
    </div></div></section>
    <section className={`${s.container} ${s.office}`} aria-labelledby="office-heading"><div><p className={s.eyebrow}>FIND US IN PUNE</p><h2 id="office-heading" className={s.heading}>A place to connect.</h2><address>{WELLCABS.address}</address><div className={s.actions}><a href={WELLCABS.mapHref} className={`${s.button} ${s.secondary}`} target="_blank" rel="noopener noreferrer">Open in Google Maps <ArrowUpRight size={18}/><span className="sr-only"> (opens in a new tab)</span></a></div></div><div className={s.officeArt}><div className={s.officePin}><MapPin size={36} aria-hidden="true"/><div><strong>Wellcabs</strong><small>Mega Center · Hadapsar, Pune</small></div></div><span className={s.officeCaption}>Location illustration · open Maps for directions</span></div></section>
    <section className={s.section}><div className={s.container}><p className={s.eyebrow}>BEFORE YOU GET IN TOUCH</p><h2 className={s.heading}>A few useful answers.</h2>{[
      ["What should I include in a booking enquiry?","Share your pickup and destination, travel date, preferred time and passenger count. For an existing booking, include its reference. Please keep payment credentials private."],
      ["Where can I see current fares and vehicle choices?","Use the cab search to see current marketplace results for your trip. Review the fare details and available vehicle information before continuing to booking."],
      ["Can I ask about a tour from Pune or Mumbai?","Yes. Contact Wellcabs with your preferred dates and itinerary to discuss options. Availability and the final arrangements must be confirmed for your journey."],
    ].map(([question,answer])=><details key={question} className={s.faq}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
  </PublicShell>;
}
