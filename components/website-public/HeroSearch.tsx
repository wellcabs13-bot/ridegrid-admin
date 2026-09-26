"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { JOURNEYS, journeyOptions, marketplaceResultsHref, marketplaceIntentHref, normalizePricingOptions, locationKey, categoryKey, type PricingOption, type SearchContext } from "@/lib/website-public/marketplace";
import s from "./public.module.css";
const unique = (values: (string | null)[]) => {
  const result = new Map<string, string>();
  for (const value of values) if (value && !result.has(locationKey(value))) result.set(locationKey(value), value);
  return [...result.values()].sort();
};
export default function HeroSearch({ heading = "Where are we taking you?", description = "Choose your journey. Explore available vehicles and fares.", context }: { heading?: string; description?: string; context?: SearchContext }) {
  const router = useRouter();
  const [options, setOptions] = useState<PricingOption[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [journey, setJourney] = useState(0), [city, setCity] = useState(""), [destination, setDestination] = useState(""), [packageId, setPackageId] = useState(""), [category, setCategory] = useState("");
  const [date, setDate] = useState(""), [time, setTime] = useState(""), [retry, setRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [endDate, setEndDate] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    setCity(context?.city || ""); setDestination(context?.destination || "");
    setCategory(context?.category ? categoryKey(context.category).toUpperCase() : "");
    setJourney(context?.service === "LOCAL" ? 3 : context?.service === "ROUNDTRIP" ? 1 : 0);
    fetch("/api/marketplace/options", { cache: "no-store", signal: controller.signal }).then(async r => {
      const json = await r.json(); if (!r.ok || !json.success || !Array.isArray(json.data)) throw new Error("Journey options are temporarily unavailable. Please try again.");
      if (!controller.signal.aborted) {
        const normalized = normalizePricingOptions(json.data); setOptions(normalized);
        const requested = context?.service === "LOCAL" ? 3 : context?.service === "ROUNDTRIP" ? 1 : 0;
        const first = context ? requested : JOURNEYS.findIndex((_, i) => journeyOptions(normalized, i).length > 0);
        setJourney(first < 0 ? 0 : first);
        const rows = journeyOptions(normalized, first < 0 ? 0 : first);
        const match = rows.find(o => locationKey((o.pricingType === "OUTSTATION" ? o.fromCity : o.city) || "") === locationKey(context?.city || ""));
        setCity(context?.city || ""); setDestination(context?.destination || "");
        setCategory(context?.category ? categoryKey(context.category).toUpperCase() : "");
        if (match) {
          const pickup = unique(rows.map(o => o.pricingType === "OUTSTATION" ? o.fromCity : o.city)).find(value => locationKey(value) === locationKey(context?.city || "")) || ""; setCity(pickup);
          const trip = rows.find(o => locationKey(o.fromCity || o.city || "") === locationKey(pickup) && locationKey(o.toCity || "") === locationKey(context?.destination || ""));
          if (trip?.toCity) setDestination(trip.toCity);
          const vehicle = rows.find(o => locationKey(o.fromCity || o.city || "") === locationKey(pickup) && (!context?.destination || o.toCity === trip?.toCity) && categoryKey(o.vehicleCategory) === categoryKey(context?.category || ""));
          if (vehicle) setCategory(vehicle.vehicleCategory);
        }
      }
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load journeys."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry, context]);
  const selectedJourney = JOURNEYS[journey], scoped = journeyOptions(options, journey);
  const outstation = selectedJourney.service === "OUTSTATION", airport = selectedJourney.service === "AIRPORT";
  const cities = unique([...scoped.map(o => outstation ? o.fromCity : o.city), context?.city || null]);
  const fromOptions = scoped.filter(o => locationKey((outstation ? o.fromCity : o.city) || "") === locationKey(city));
  const destinations = unique([...fromOptions.map(o => o.toCity), ...(locationKey(city) === locationKey(context?.city || "") ? [context?.destination || null, ...(context?.destinations || [])] : [])]).filter(v => locationKey(v) !== locationKey(city));
  const routeOptions = fromOptions.filter(o => !outstation || locationKey(o.toCity || "") === locationKey(destination));
  const packages = [...new Map(fromOptions.map(o => [airport ? `${o.airportName}|${o.transferDirection}|${o.includedKm}` : o.packageName, o])).values()];
  const selectedPackage = packages.find(o => o.id === packageId);
  const categories = unique((outstation ? routeOptions : fromOptions.filter(o => selectedPackage && (airport ? o.airportName === selectedPackage.airportName && o.transferDirection === selectedPackage.transferDirection && o.includedKm === selectedPackage.includedKm : o.packageName === selectedPackage.packageName))).map(o => o.vehicleCategory));
  const today = new Date(); const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  function resetTrip(i: number) {
    const rows = journeyOptions(options, i);
    const pickup = unique(rows.map(o => o.pricingType === "OUTSTATION" ? o.fromCity : o.city)).find(value => locationKey(value) === locationKey(city || context?.city || "")) || "";
    const drop = unique(rows.filter(o => locationKey(o.fromCity || "") === locationKey(pickup)).map(o => o.toCity)).find(value => locationKey(value) === locationKey(destination || context?.destination || "")) || "";
    setJourney(i); setCity(pickup || context?.city || ""); setDestination(drop || context?.destination || ""); setPackageId(""); setCategory(context?.category ? categoryKey(context.category).toUpperCase() : ""); setError("");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const option = outstation ? routeOptions.find(o => !category || o.vehicleCategory === category) : selectedPackage;
    if ((!option && !context) || !city || (outstation && !destination)) { setError("Choose your pickup and a journey from the available options."); return; }
    if (airport && (!option?.airportName || !option?.transferDirection || option?.includedKm === null)) { setError("This airport option is incomplete. Please select another journey."); return; }
    const pickup = new Date(`${date}T${time}:00`);
    if (!date || !time || !Number.isFinite(pickup.getTime()) || pickup <= new Date()) { setError("Choose a future pickup date and time."); return; }
    if (selectedJourney.trip === "ROUNDTRIP" && (!endDate || endDate < date)) { setError("Choose a return date on or after pickup."); return; }
    setSubmitting(true);
    router.push(option ? marketplaceResultsHref(option, date, time, category, endDate) : marketplaceIntentHref({ city, destination, category, service: outstation ? selectedJourney.trip === "ROUNDTRIP" ? "ROUNDTRIP" : "ONE_WAY" : "LOCAL" }, date, time, endDate));
  }
  return <div id="ride-search" className={s.searchWrap}><div className={s.container}><section className={s.search} aria-label="Find a ride"><h2 className={s.searchTitle}>{heading}</h2>{description && <p className={s.muted}>{description}</p>}
    {(loading || (!options.length && !context)) && <button type="button" disabled className={`${s.button} ${s.searchSubmit}`}>Search rides</button>}
    {loading ? <p role="status" className={s.muted}>Loading journey options...</p> : <>
      <div className={s.tabs} role="group" aria-label="Journey type">{JOURNEYS.map((j, i) => <button key={j.label} type="button" aria-pressed={journey === i} disabled={!journeyOptions(options, i).length && !(context && [0, 1, 3].includes(i))} className={`${s.tab} ${journey === i ? s.tabActive : ""}`} onClick={() => resetTrip(i)}>{j.label}<span className="sr-only">{!journeyOptions(options, i).length && !(context && [0, 1, 3].includes(i)) ? " - unsupported" : ""}</span></button>)}</div>
      {!options.length && !context ? <div className={s.notice}><p>{error || "There are no journey options to book at the moment. Please check back soon."}</p><button type="button" className={s.button} onClick={() => setRetry(v => v + 1)}>Try again</button></div> : <form onSubmit={submit}>
        <div className={s.fields}><label className={s.field}><span><MapPin size={12} className="inline" /> {outstation ? "Pickup city" : "City"}</span><select required value={city} onChange={e => { setCity(e.target.value); setDestination(""); setPackageId(""); setCategory(""); }}><option value="">Choose pickup</option>{cities.map(v => <option key={v}>{v}</option>)}</select></label>
          {outstation ? <label className={s.field}>Destination<select required disabled={!city} value={destination} onChange={e => { setDestination(e.target.value); setCategory(""); }}><option value="">Where to?</option>{destinations.map(v => <option key={v}>{v}</option>)}</select></label> : <label className={s.field}>{airport ? "Airport / transfer / distance" : "Journey package"}<select required={!context} disabled={!city} value={packageId} onChange={e => { setPackageId(e.target.value); setCategory(""); }}><option value="">{context ? "Check current local packages" : "Choose an option"}</option>{packages.map(o => <option key={o.id} value={o.id}>{airport ? `${o.airportName} / ${o.transferDirection?.replaceAll("_", " ")} / ${o.includedKm ?? "Unavailable"} km` : o.packageName}</option>)}</select></label>}
          <label className={s.field}><span><CalendarDays size={12} className="inline" /> Pickup date</span><input type="date" required min={minDate} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className={s.field}>Pickup time<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
          {selectedJourney.trip === "ROUNDTRIP" && <label className={s.field}>Return date<input type="date" required min={date || minDate} value={endDate} onChange={e => setEndDate(e.target.value)} /></label>}
        </div><div className={s.searchBottom}><label className={s.field}>Vehicle preference<select disabled={!categories.length && !context?.category} aria-label="Vehicle preference" value={category} onChange={e => setCategory(e.target.value)}><option value="">All available categories</option>{unique([...categories, context?.category ? categoryKey(context.category).toUpperCase() : null]).map(v => <option key={v}>{v}</option>)}</select></label><p className={s.muted}>See current options for your trip.<br />Choose your vehicle before you book.</p><button type="submit" disabled={submitting} aria-busy={submitting} className={`${s.button} ${s.searchSubmit}`}>{submitting ? "Finding your ride..." : "Search rides"} <ArrowUpRight size={17} /></button></div>
        {error && <p role="alert" className={s.notice}>{error}</p>}
        {context?.category && <p className={s.muted}>This preference searches the {categoryKey(context.category)} category. Check the actual model, seats, luggage space and features in each listing.</p>}
      </form>}
    </>}
  </section></div></div>;
}
