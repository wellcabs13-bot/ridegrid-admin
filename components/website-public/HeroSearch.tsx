"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Plane, Users } from "lucide-react";
import { AIRPORT_CITIES, airportIntentHref, categoryKey, JOURNEYS, journeyOptions, locationKey, marketplaceIntentHref, marketplaceResultsHref, normalizePricingOptions, withPassengers, type PricingOption, type SearchContext } from "@/lib/website-public/marketplace";
import s from "./public.module.css";

const PASSENGERS = [1, 2, 3, 4, 5, 6, 7];
const unique = (values: (string | null | undefined)[]) => {
  const result = new Map<string, string>();
  for (const value of values) if (value && !result.has(locationKey(value))) result.set(locationKey(value), value);
  return [...result.values()].sort();
};
const indexOf = (service?: string) => service === "LOCAL" ? 2 : service === "ROUNDTRIP" ? 1 : service === "AIRPORT" ? 3 : service === "TOUR_PACKAGE" ? 4 : 0;

export default function HeroSearch({ heading = "Where are we taking you?", description = "Choose your journey. Compare real cars with their drivers and the full fare.", context, initialOptions }: { heading?: string; description?: string; context?: SearchContext; initialOptions?: unknown[] }) {
  const router = useRouter();
  const preloaded = useMemo(() => (initialOptions ? normalizePricingOptions(initialOptions) : null), [initialOptions]);
  const [options, setOptions] = useState<PricingOption[]>(preloaded ?? []);
  const [loading, setLoading] = useState(!preloaded);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [journey, setJourney] = useState(indexOf(context?.service));
  const [city, setCity] = useState(context?.city || ""), [destination, setDestination] = useState(context?.destination || "");
  const [packageId, setPackageId] = useState(""), [category, setCategory] = useState(context?.category ? categoryKey(context.category).toUpperCase() : "");
  const [date, setDate] = useState(""), [time, setTime] = useState(""), [endDate, setEndDate] = useState("");
  const [passengers, setPassengers] = useState(1), [direction, setDirection] = useState<"PICKUP" | "DROP">("PICKUP");
  const [submitting, setSubmitting] = useState(false);

  // Aligns the requested page intent with the live option spelling (e.g. "pune").
  function prefill(rows: PricingOption[], index: number) {
    const scoped = journeyOptions(rows, index);
    const pickup = unique(scoped.map((o) => (o.pricingType === "OUTSTATION" ? o.fromCity : o.city))).find((v) => locationKey(v) === locationKey(context?.city || ""));
    if (!pickup) return;
    setCity(pickup);
    const trip = scoped.find((o) => locationKey(o.fromCity || o.city || "") === locationKey(pickup) && locationKey(o.toCity || "") === locationKey(context?.destination || ""));
    if (trip?.toCity) setDestination(trip.toCity);
    const vehicle = scoped.find((o) => locationKey(o.fromCity || o.city || "") === locationKey(pickup) && (!context?.destination || o.toCity === trip?.toCity) && categoryKey(o.vehicleCategory) === categoryKey(context?.category || ""));
    if (vehicle) setCategory(vehicle.vehicleCategory);
    const tour = context?.tour ? scoped.find((o) => locationKey(o.city || "") === locationKey(pickup) && o.packageName.toLowerCase() === context.tour!.toLowerCase()) : undefined;
    if (tour) setPackageId(tour.id);
  }

  useEffect(() => {
    // Menu deep links such as /marketplace?trip=local12 choose the journey on arrival.
    if (context || typeof window === "undefined") return;
    const trip = new URLSearchParams(window.location.search).get("trip");
    if (trip === "local" || trip === "local12") setJourney(2);
    if (trip === "airport-pickup" || trip === "airport-drop") { setJourney(3); setDirection(trip === "airport-drop" ? "DROP" : "PICKUP"); }
    if (trip === "roundtrip") setJourney(1);
    if (trip === "tours") setJourney(4);
  }, [context]);

  useEffect(() => {
    if (preloaded) { if (context) prefill(preloaded, indexOf(context.service)); return; }
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/marketplace/options?include=tours", { cache: "no-store", signal: controller.signal }).then(async (r) => {
      const json = await r.json();
      if (!r.ok || !json.success || !Array.isArray(json.data)) throw new Error("Journey options are temporarily unavailable. Please try again.");
      if (controller.signal.aborted) return;
      const rows = normalizePricingOptions(json.data);
      setOptions(rows);
      if (context) prefill(rows, indexOf(context.service));
      else { const first = JOURNEYS.findIndex((_, i) => journeyOptions(rows, i).length > 0); if (first >= 0) setJourney((j) => (j >= 2 ? j : first)); }
    }).catch((e) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load journeys."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // prefill reads only stable context; re-run on retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry, context, preloaded]);

  const selected = JOURNEYS[journey];
  const outstation = selected.service === "OUTSTATION", airport = selected.service === "AIRPORT", local = selected.service === "LOCAL", tour = selected.service === "TOUR_PACKAGE";
  // Local packages and Tours are both chosen by name (package / published tour) from the live options.
  const packaged = local || tour;
  const scoped = journeyOptions(options, journey);
  const cities = airport ? unique([...AIRPORT_CITIES, ...options.map((o) => o.city)]) : unique([...scoped.map((o) => (outstation ? o.fromCity : o.city)), context?.city || null]);
  const fromOptions = scoped.filter((o) => locationKey((outstation ? o.fromCity : o.city) || "") === locationKey(city));
  const destinations = unique([...fromOptions.map((o) => o.toCity), ...(locationKey(city) === locationKey(context?.city || "") ? [context?.destination || null, ...(context?.destinations || [])] : [])]).filter((v) => locationKey(v) !== locationKey(city));
  const routeOptions = fromOptions.filter((o) => !outstation || locationKey(o.toCity || "") === locationKey(destination));
  const packages = [...new Map(fromOptions.map((o) => [o.packageName, o])).values()];
  const selectedPackage = packages.find((o) => o.id === packageId);
  const categories = unique((outstation ? routeOptions : packaged ? fromOptions.filter((o) => !selectedPackage || o.packageName === selectedPackage.packageName) : []).map((o) => o.vehicleCategory));
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const noOptions = !options.length && !context;

  // A 12-hour package deep link preselects the live 12-hour package, when one exists.
  useEffect(() => {
    if (!local || packageId || !city || typeof window === "undefined") return;
    const trip = new URLSearchParams(window.location.search).get("trip");
    if (trip !== "local" && trip !== "local12") return;
    const live = journeyOptions(options, journey).filter((o) => locationKey(o.city || "") === locationKey(city));
    const match = live.find((p) => (trip === "local12" ? /\b12\b/.test(p.packageName) : /\b8\b/.test(p.packageName)));
    if (match) setPackageId(match.id);
  }, [local, city, packageId, options, journey]);

  function choose(i: number) {
    const rows = journeyOptions(options, i);
    const pickup = unique(rows.map((o) => (o.pricingType === "OUTSTATION" ? o.fromCity : o.city))).find((v) => locationKey(v) === locationKey(city || context?.city || "")) || "";
    const drop = unique(rows.filter((o) => locationKey(o.fromCity || "") === locationKey(pickup)).map((o) => o.toCity)).find((v) => locationKey(v) === locationKey(destination || context?.destination || "")) || "";
    setJourney(i); setCity(pickup || (JOURNEYS[i].service === "AIRPORT" ? city : context?.city || "")); setDestination(drop || context?.destination || ""); setPackageId(""); setCategory(context?.category ? categoryKey(context.category).toUpperCase() : ""); setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!city || (outstation && !destination)) { setError(airport ? "Choose the airport city." : "Choose your pickup and a journey from the available options."); return; }
    const pickup = new Date(`${date}T${time}:00`);
    if (!date || !time || !Number.isFinite(pickup.getTime()) || pickup <= new Date()) { setError("Choose a future pickup date and time."); return; }
    if (selected.trip === "ROUNDTRIP" && (!endDate || endDate < date)) { setError("Choose a return date on or after pickup."); return; }
    let href: string;
    try {
      if (airport) href = airportIntentHref({ city, direction, passengers }, date, time);
      else {
        const option = outstation ? routeOptions.find((o) => !category || o.vehicleCategory === category) : selectedPackage;
        if (!option && (tour ? !context?.tour : !context && !local)) { setError("Choose your pickup and a journey from the available options."); return; }
        href = option ? marketplaceResultsHref(option, date, time, category, endDate) : marketplaceIntentHref({ city, destination, category, service: outstation ? (selected.trip === "ROUNDTRIP" ? "ROUNDTRIP" : "ONE_WAY") : tour ? "TOUR_PACKAGE" : "LOCAL", tour: context?.tour }, date, time, endDate);
        href = withPassengers(href, passengers);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Check your trip details."); return; }
    setSubmitting(true);
    router.push(href);
  }

  const passengerField = <label className={s.field}><span><Users size={12} className="inline" aria-hidden="true" /> Passengers</span><select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>{PASSENGERS.map((n) => <option key={n} value={n}>{n}{n === 7 ? "+" : ""}</option>)}</select></label>;

  return <div id="ride-search" className={s.searchWrap}><section className={s.search} aria-label="Find a ride">
    <h2 className={s.searchTitle}>{heading}</h2>
    {description && <p className={s.muted}>{description}</p>}
    {loading ? <p role="status" className={s.muted}>Loading journey options...</p> : <>
      <div className={s.tabs} role="group" aria-label="Journey type">{JOURNEYS.map((j, i) => <button key={j.label} type="button" aria-pressed={journey === i} className={`${s.tab} ${journey === i ? s.tabActive : ""}`} onClick={() => choose(i)}>{j.label}</button>)}</div>
      {noOptions ? <div className={s.notice}><p>{error || "There are no journey options to book at the moment. Please check back soon."}</p><button type="button" className={s.button} onClick={() => setRetry((v) => v + 1)}>Try again</button></div> : <form onSubmit={submit}>
        <div className={s.fields}>
          {airport && <label className={s.field}><span><Plane size={12} className="inline" aria-hidden="true" /> Transfer</span><select value={direction} onChange={(e) => setDirection(e.target.value as "PICKUP" | "DROP")}><option value="PICKUP">Pickup from airport</option><option value="DROP">Drop to airport</option></select></label>}
          <label className={s.field}><span><MapPin size={12} className="inline" aria-hidden="true" /> {outstation ? "Pickup city" : airport ? "Airport city" : tour ? "Starting city" : "City"}</span><select required value={city} onChange={(e) => { setCity(e.target.value); setDestination(""); setPackageId(""); setCategory(""); }}><option value="">{outstation ? "Choose pickup" : "Choose city"}</option>{cities.map((v) => <option key={v}>{v}</option>)}</select></label>
          {outstation && <label className={s.field}>Destination<select required disabled={!city} value={destination} onChange={(e) => { setDestination(e.target.value); setCategory(""); }}><option value="">Where to?</option>{destinations.map((v) => <option key={v}>{v}</option>)}</select></label>}
          {tour && <label className={s.field}>Tour<select required={!context?.tour} disabled={!city} value={packageId} onChange={(e) => { setPackageId(e.target.value); setCategory(""); }}><option value="">{packages.length ? "Choose a tour" : context?.tour || "No priced tours yet"}</option>{packages.map((o) => <option key={o.id} value={o.id}>{o.packageName}</option>)}</select></label>}
          {local && <label className={s.field}>Journey package<select required={!context && packages.length > 0} disabled={!city} value={packageId} onChange={(e) => { setPackageId(e.target.value); setCategory(""); }}><option value="">{packages.length ? "Choose a package" : "Check current local packages"}</option>{packages.map((o) => <option key={o.id} value={o.id}>{o.packageName}</option>)}</select></label>}
          <label className={s.field}><span><CalendarDays size={12} className="inline" aria-hidden="true" /> Pickup date</span><input type="date" required min={minDate} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className={s.field}>Pickup time<input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
          {selected.trip === "ROUNDTRIP" && <label className={s.field}>Return date<input type="date" required min={date || minDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>}
          {!local && passengerField}
        </div>
        <div className={s.searchBottom}>
          {!airport && <label className={s.field}>Vehicle preference<select disabled={!categories.length && !context?.category} aria-label="Vehicle preference" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All available categories</option>{unique([...categories, context?.category ? categoryKey(context.category).toUpperCase() : null]).map((v) => <option key={v}>{v}</option>)}</select></label>}
          <p className={s.searchNote}>{airport ? "Airport cars appear as vendors publish airport fares for your city." : tour ? "Only cars with a published price for this tour are listed. Tour notes appear with each car." : "You choose the exact car and driver, then see the full fare before booking."}</p>
          <button type="submit" disabled={submitting} aria-busy={submitting} className={`${s.button} ${s.searchSubmit}`}>{submitting ? "Finding your ride..." : "Search rides"} <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
        {error && <p role="alert" className={s.notice}>{error}</p>}
        {context?.category && <p className={s.muted}>This preference searches the {categoryKey(context.category)} category. Check the actual model, seats, luggage space and features in each listing.</p>}
      </form>}
    </>}
    {(loading || noOptions) && <div className={`${s.searchBottom} ${s.searchBottomEnd}`}><button type="button" disabled className={`${s.button} ${s.searchSubmit}`}>Search rides</button></div>}
  </section></div>;
}
