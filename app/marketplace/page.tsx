import HeroSearch from "@/components/website-public/HeroSearch";
import { listMarketplaceOptions } from "@/lib/services/marketplace/MarketplaceOptionsService";
import m from "./Marketplace.module.css";

// The one public marketplace: the website search (Outstation, Round Trip, Local, Airport,
// Tours) over the central listing service. Results, booking and payment continue under
// /marketplace/*. A pricing outage never blocks the page; the search loads options itself.
const STEPS = [
  { title: "Choose your journey", body: "Outstation, round trip, local package, airport transfer or a published tour." },
  { title: "Compare real cars", body: "Every listing is an exact verified car with its assigned driver." },
  { title: "See the full fare", body: "Fare, GST and platform fee are shown before you book." },
  { title: "Book securely", body: "Confirm your trip details and pay through the secure gateway." },
];

export default async function MarketplacePage() {
  const options = await listMarketplaceOptions({ includeTours: true }).catch(() => undefined);
  return <>
    <section className={m.head}>
      <div className={m.container}>
        <p className={m.eyebrow}>RideGrid marketplace</p>
        <h1 className={m.title}>Find your ride</h1>
        <p className={m.lead}>Search live cars from verified vendors. Pick the exact car and driver and see the complete fare before you book.</p>
      </div>
    </section>
    <div className={`${m.container} ${m.search}`}>
      <HeroSearch heading="Where are we taking you?" description="Outstation, round trip, local, airport or tours — compare real cars with their drivers." initialOptions={options} />
    </div>
    <ol className={`${m.container} ${m.steps}`}>
      {STEPS.map((step, i) => <li key={step.title} className={m.step}><span className={m.stepNumber}>{i + 1}</span><strong>{step.title}</strong><span>{step.body}</span></li>)}
    </ol>
  </>;
}
