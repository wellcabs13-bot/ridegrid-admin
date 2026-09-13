"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { JOURNEYS, journeyOptions, marketplaceResultsHref, type PricingOption } from "@/lib/website-public/marketplace";
import s from "./public.module.css";
const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))].sort();
export default function HeroSearch({ heading = "Where are we taking you?", description = "Choose your journey. Explore available vehicles and fares." }: { heading?: string; description?: string }) {
  const router = useRouter();
  const [options, setOptions] = useState<PricingOption[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [journey, setJourney] = useState(0), [city, setCity] = useState(""), [destination, setDestination] = useState(""), [packageId, setPackageId] = useState(""), [category, setCategory] = useState("");
  const [date, setDate] = useState(""), [time, setTime] = useState(""), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    fetch("/api/marketplace/options", { cache: "no-store", signal: controller.signal }).then(async r => {
      const json = await r.json(); if (!r.ok || !json.success || !Array.isArray(json.data)) throw new Error("Journey options are temporarily unavailable. Please try again.");
      if (!controller.signal.aborted) { setOptions(json.data); const first = JOURNEYS.findIndex((_, i) => journeyOptions(json.data, i).length > 0); setJourney(first < 0 ? 0 : first); }
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load journeys."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const selectedJourney = JOURNEYS[journey], scoped = journeyOptions(options, journey);
  const outstation = selectedJourney.service === "OUTSTATION", airport = selectedJourney.service === "AIRPORT";
  const cities = unique(scoped.map(o => outstation ? o.fromCity : o.city));
  const fromOptions = scoped.filter(o => (outstation ? o.fromCity : o.city) === city);
  const destinations = unique(fromOptions.map(o => o.toCity)).filter(v => v !== city);
  const routeOptions = fromOptions.filter(o => !outstation || o.toCity === destination);
  const packages = [...new Map(fromOptions.map(o => [airport ? `${o.airportName}|${o.transferDirection}|${o.includedKm}` : o.packageName, o])).values()];
  const selectedPackage = packages.find(o => o.id === packageId);
  const categories = unique((outstation ? routeOptions : fromOptions.filter(o => selectedPackage && (airport ? o.airportName === selectedPackage.airportName && o.transferDirection === selectedPackage.transferDirection && o.includedKm === selectedPackage.includedKm : o.packageName === selectedPackage.packageName))).map(o => o.vehicleCategory));
  const today = new Date(); const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  function resetTrip(i: number) { setJourney(i); setCity(""); setDestination(""); setPackageId(""); setCategory(""); setError(""); }
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const option = outstation ? routeOptions.find(o => !category || o.vehicleCategory === category) : selectedPackage;
    if (!option || !city || (outstation && !destination)) { setError("Choose your pickup and a journey from the available options."); return; }
    if (airport && (!option.airportName || !option.transferDirection || option.includedKm === null)) { setError("This airport option is incomplete. Please select another journey."); return; }
    const pickup = new Date(`${date}T${time}:00`);
    if (!date || !time || !Number.isFinite(pickup.getTime()) || pickup <= new Date()) { setError("Choose a future pickup date and time."); return; }
    router.push(marketplaceResultsHref(option, date, time, category));
  }
  return <div id="ride-search" className={s.searchWrap}><div className={s.container}><section className={s.search} aria-label="Find a ride"><h2 className={s.searchTitle}>{heading}</h2>{description && <p className={s.muted}>{description}</p>}
    {loading ? <p role="status" className={s.muted}>Loading journey optionsâ€¦</p> : <>
      <div className={s.tabs} role="group" aria-label="Journey type">{JOURNEYS.map((j, i) => <button key={j.label} type="button" aria-pressed={journey === i} disabled={!journeyOptions(options, i).length} className={`${s.tab} ${journey === i ? s.tabActive : ""}`} onClick={() => resetTrip(i)}>{j.label}<span className="sr-only">{!journeyOptions(options, i).length ? " â€” unavailable" : ""}</span></button>)}</div>
      {!options.length ? <div className={s.notice}><p>{error || "There are no journey options to book at the moment. Please check back soon."}</p><button type="button" className={s.button} onClick={() => setRetry(v => v + 1)}>Try again</button></div> : <form onSubmit={submit}>
        <div className={s.fields}><label className={s.field}><span><MapPin size={12} className="inline" /> {outstation ? "Pickup city" : "City"}</span><select required value={city} onChange={e => { setCity(e.target.value); setDestination(""); setPackageId(""); setCategory(""); }}><option value="">Choose pickup</option>{cities.map(v => <option key={v}>{v}</option>)}</select></label>
          {outstation ? <label className={s.field}>Destination<select required disabled={!city} value={destination} onChange={e => { setDestination(e.target.value); setCategory(""); }}><option value="">Where to?</option>{destinations.map(v => <option key={v}>{v}</option>)}</select></label> : <label className={s.field}>{airport ? "Airport / transfer / distance" : "Journey package"}<select required disabled={!city} value={packageId} onChange={e => { setPackageId(e.target.value); setCategory(""); }}><option value="">Choose an option</option>{packages.map(o => <option key={o.id} value={o.id}>{airport ? `${o.airportName} Â· ${o.transferDirection?.replaceAll("_", " ")} Â· ${o.includedKm ?? "â€”"} km` : o.packageName}</option>)}</select></label>}
          <label className={s.field}><span><CalendarDays size={12} className="inline" /> Pickup date</span><input type="date" required min={minDate} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className={s.field}>Pickup time<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
        </div><div className={s.searchBottom}><label className={s.field}>Vehicle preference<select aria-label="Vehicle preference" value={category} onChange={e => setCategory(e.target.value)}><option value="">All available categories</option>{categories.map(v => <option key={v}>{v}</option>)}</select></label><p className={s.muted}>See current options for your trip.<br />Choose your vehicle before you book.</p><button type="submit" className={`${s.button} ${s.searchSubmit}`}>Search rides <ArrowUpRight size={17} /></button></div>
        {error && <p role="alert" className={s.notice}>{error}</p>}
      </form>}
    </>}
  </section></div></div>;
}
