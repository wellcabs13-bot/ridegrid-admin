import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, CarFront, Check, Compass, MapPin, MapPinned, Plane, Route, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { resolveHomepage } from "@/lib/website-public/homepage";
import { WELLCABS } from "@/lib/website-public/brand";
import { ContentBlocks, FAQ } from "./Content";
import Image from "./ResilientImage";
import ManagedImage from "./ManagedImage";
import HeroSearch from "./HeroSearch";
import HomepageMarketplaceRoutes from "./HomepageMarketplaceRoutes";
import JourneyVisual from "./JourneyVisual";
import PublicShell from "./PublicShell";
import h from "./HomepagePremium.module.css";

const services = [
  { title:"Airport transfers", tag:"FROM TOUCHDOWN TO TOWN", body:"Start or finish your flight with a pickup or drop that fits your plans.", Icon:Plane, href:"/#ride-search", kind:"airport" },
  { title:"Local cabs", tag:"YOUR CITY, AT YOUR PACE", body:"Everyday errands, a day out or a full schedule. Explore local cab packages.", Icon:MapPinned, href:"/#ride-search", kind:"local" },
  { title:"One-way journeys", tag:"A FRESH DIRECTION", body:"Going somewhere new? Find an intercity ride for the way you’re headed.", Icon:ArrowUpRight, href:"/#ride-search", kind:"oneway" },
  { title:"Outstation travel", tag:"BEYOND THE EVERYDAY", body:"Make room for a change of scenery. Compare available outstation cabs.", Icon:Route, href:"/#ride-search", kind:"outstation" },
  { title:"Round trips", tag:"THERE, AND BACK AGAIN", body:"Plan your journey out and your return with the right vehicle for your trip.", Icon:CarFront, href:"/#ride-search", kind:"roundtrip" },
  { title:"Tours & getaways", tag:"A LITTLE MORE EXPLORING", body:"Planning a tour from Pune or Mumbai? Tell us your dates and itinerary.", Icon:Compass, href:"/contact", kind:"tour" },
];
const faqs = [
  { question:"How do I book a cab with Wellcabs?", answer:"Choose your journey type, pickup location and travel date in the search above. Compare current marketplace results, choose your cab and review your trip details before continuing to booking." },
  { question:"Where can I see the complete fare?", answer:"Open the fare details for your selected marketplace option and review the final payable amount before booking. Availability and quoted amounts depend on your trip and the current options." },
  { question:"Can I choose the vehicle for my journey?", answer:"Yes. The marketplace presents vehicle information and available categories for your search. Compare the options returned for your route and travel time." },
  { question:"Can someone help me plan a trip?", answer:"Contact Wellcabs on 9011079304 or WhatsApp, or email service@wellcabs.com. Share your pickup, destination, date and passenger count so the team can understand your plans." },
];
export default function Homepage({page}:{page:Awaited<ReturnType<typeof resolveHomepage>>}) {
  const {chrome,hero,sections,discovery}=page;
  const heroMedia=chrome.images?.heroImage ?? chrome.media.find(item=>item.category==="HERO")?.asset ?? null;
  const enabled=(type:string)=>sections.find(section=>section.type===type);
  const searchSection=enabled("SEARCH"), routesSection=enabled("ROUTES"), marketplaceSection=enabled("MARKETPLACE"), ctaSection=enabled("CTA");
  const serviceMedia=chrome.images?.sectionImage1 ?? chrome.media.find(item=>item.category==="SERVICE")?.asset;
  return <PublicShell navigation={chrome.navigation}>
    <ContentBlocks blocks={chrome.blocks} placement="BEFORE_PRIMARY_CONTENT"/>
    {enabled("HERO") ? <section className={h.hero}>
      <div className={h.heroBackdrop}>{heroMedia && <Image src={heroMedia.src} alt={heroMedia.alt} fill priority unoptimized sizes="100vw" className={h.heroBackgroundImage}/>}<div className={h.heroShade}/><div className={h.heroOrbit} aria-hidden="true"/></div>
      <div className={`${h.container} ${h.heroGrid}`}><div className={h.heroContent}>
        <p className={h.eyebrow}><span/> WELLCABS · THE CAB MARKETPLACE</p>
        <h1>{hero.title || "Good journeys. Great choices."}</h1>
        <p className={h.heroDescription}>{hero.subtitle || "From your everyday commute to your next great escape. Find your cab, compare the fare and make the journey yours."}</p>
        <div className={h.heroActions}><Link href="/#ride-search" className={h.primaryButton}>Find your cab <ArrowUpRight size={20}/></Link><Link href="/#services" className={h.secondaryButton}>Explore the possibilities <ArrowRight size={17}/></Link></div>
        <div className={h.heroSignals}><span><CarFront size={16}/> Choose your cab</span><span><ShieldCheck size={16}/> Review the full fare</span><span><MapPin size={16}/> Go your way</span></div>
      </div><div className={h.heroCompanion}><JourneyVisual/></div></div>
      <div className={`${h.container} ${h.heroFootnote}`}><span>THE EVERYDAY. THE GETAWAY. EVERYTHING BETWEEN.</span><span>Scroll to find your ride <span aria-hidden="true">↓</span></span></div>
    </section> : <h1 className="sr-only">{hero.title || "Wellcabs"}</h1>}
    {searchSection && <section className={h.searchStage}><HeroSearch heading={searchSection.heading || "Where are we taking you?"} description="Choose your journey. Compare current cabs and fares. Find your way forward."/></section>}
    <section className={h.coverage}><div className={h.container}><p>OUR LAUNCH CITIES</p><ul>{["Pune","Mumbai","Nashik","Nagpur","Chhatrapati Sambhajinagar"].map(city=><li key={city}><span aria-hidden="true"/> {city}</li>)}</ul><small>Search to confirm current route availability.</small></div></section>
    <section id="services" className={h.section}><div className={h.container}>
      <span id="outstation"/><span id="local-cabs"/><span id="airport-transfers"/>
      <div className={h.sectionHeading}><div><p className={h.sectionEyebrow}>WHATEVER TAKES YOU PLACES</p><h2>One destination.<br/>A world of possibilities.</h2></div><p>A flight to catch. A city to explore. A road calling your name. Start with the journey you have in mind.</p></div>
      <div className={h.serviceGrid}>{services.map(({title,tag,body,Icon,href,kind},i)=><article key={kind} className={h.serviceCard} data-reveal>
        <div className={`${h.serviceVisual} ${h[kind]}`} aria-hidden="true">{serviceMedia && i===0 ? <ManagedImage media={serviceMedia} cover/> : <><div className={h.serviceRoad}/><Icon className={h.serviceIllustration} strokeWidth={1}/><span className={h.serviceNumber}>0{i+1}</span></>}</div>
        <div className={h.serviceBody}><p>{tag}</p><h3>{title}</h3><span>{body}</span><Link href={href}>{kind==="tour" ? "Plan a getaway" : "Explore rides"}<ArrowUpRight size={19}/></Link></div>
      </article>)}</div>
    </div></section>
    <section className={h.trustSection}><div className={h.container}><div className={h.sectionHeading}><div><p className={h.sectionEyebrow}>WHY WELLCABS</p><h2>The freedom to choose.<br/>The clarity to go.</h2></div><p>Good travel starts before you get in the car. We bring the details together, so you can focus on the journey.</p></div><div className={h.trustGrid}>
      {[{Icon:CarFront,title:"Your cab, your choice",body:"Compare the available vehicles and choose what suits your trip."},{Icon:ShieldCheck,title:"See the fare clearly",body:"Review the price breakdown and final amount before you book."},{Icon:Route,title:"One connected journey",body:"Move from search to vehicle choice to booking in one place."}].map(({Icon,title,body},i)=><article key={title} data-reveal><span className={h.trustIndex}>0{i+1}</span><Icon/><h3>{title}</h3><p>{body}</p></article>)}
    </div></div></section>
    {routesSection && <HomepageMarketplaceRoutes media={chrome.images?.cardImage}/>}
    {marketplaceSection && <section className={`${h.section} ${h.marketplace}`}><div className={`${h.container} ${h.marketplaceGrid}`}><div><p className={h.eyebrow}>THE MARKETPLACE DIFFERENCE</p><h2>Find a ride that<br/><em>feels like your ride.</em></h2><p>Compare current vehicle choices, passenger space and fare details. You’re in the driver’s seat when it comes to choosing.</p><Link href="/marketplace" className={h.primaryButton}>Explore the marketplace <ArrowUpRight size={19}/></Link></div><div className={h.marketplacePanel}>{[{Icon:MapPinned,title:"Tell us where",body:"Your route. Your date. Your pickup time."},{Icon:CarFront,title:"Make it yours",body:"Compare current vehicles and complete fares."},{Icon:Check,title:"Review, then book",body:"Confirm the details before your journey begins."}].map(({Icon,title,body},i)=><article key={title}><span className={h.stepNumber}>0{i+1}</span><Icon size={22}/><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></div></section>}
    {discovery.length>0 && <section id="discover" className={h.section}><div className={h.container}><div className={h.sectionHeading}><div><p className={h.sectionEyebrow}>LET CURIOSITY LEAD</p><h2>Places worth going.</h2></div><p>Explore our published destination, route and travel guides. Then search for the current ride options.</p></div><div className={h.discoveryGrid}>{discovery.map(item=><Link key={item.href} href={item.href} className={h.discoveryCard} data-reveal><div className={h.discoveryVisual}>{item.image ? <ManagedImage media={item.image} cover/> : <MapPinned size={50} strokeWidth={1}/>}<span>{item.type.toLowerCase()}</span></div><div><h3>{item.label}<ArrowUpRight size={20}/></h3><p>{item.description}</p></div></Link>)}</div></div></section>}
    <section id="corporate-mobility" className={`${h.section} ${h.corporate}`}><div className={`${h.container} ${h.corporateGrid}`}><div id="corporate"><p className={h.sectionEyebrow}>FOR THE WAY YOUR BUSINESS MOVES</p><h2>Big plans.<br/>Thoughtful travel.</h2><p>From individual work trips to travel for your team, talk to Wellcabs about your business travel needs.</p><div className={h.heroActions}><a href={`${WELLCABS.emailHref}?subject=Business%20travel%20enquiry`} className={h.primaryButton}>Let’s talk business <ArrowUpRight size={18}/></a><Link href="/business-travel-terms" className={h.textLink}>Business travel information <ArrowRight size={16}/></Link></div></div><div className={h.corporateVisual}>{chrome.images?.sectionImage2 ? <ManagedImage media={chrome.images.sectionImage2} cover/> : <><Building2 size={90} strokeWidth={.8}/><div><Users size={22}/><span>For people.<br/><strong>For possibilities.</strong></span></div></>}</div></div></section>
    <div id="travel-guides"><FAQ heading="Before your next journey." items={faqs}/></div>
    {sections.filter(section=>section.type==="CONTENT"&&(section.heading||section.description)).map(section=><section className={h.section} key={section.id}><div className={h.container}><h2 className={h.contentHeading}>{section.heading}</h2><p className={h.contentText}>{section.description}</p></div></section>)}
    <section id="about" className={h.about}><div className={h.container}><Sparkles size={24}/><p>Less about getting from A to B.<br/><strong>More about everything in between.</strong></p><Link href="/about">Meet Wellcabs <ArrowUpRight size={18}/></Link></div></section>
    <ContentBlocks blocks={chrome.blocks} placement="BEFORE_CTA"/>
    {ctaSection && <section className={h.ctaSection}>{chrome.images?.featuredImage && <div className={h.ctaBackdrop}><ManagedImage media={chrome.images.featuredImage} cover/></div>}<div className={`${h.container} ${h.cta}`}><div><p className={h.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</p><h2>{ctaSection.heading || "Go somewhere good."}</h2><p>{ctaSection.description || "The everyday. The getaway. Your next journey."}</p></div><Link href="/#ride-search" className={h.primaryButton}>Find your cab <ArrowUpRight size={20}/></Link></div></section>}
    <ContentBlocks blocks={chrome.blocks} placement="AFTER_CTA"/>
    <ContentBlocks blocks={chrome.blocks} placement="AFTER_PRIMARY_CONTENT"/>
  </PublicShell>;
}
