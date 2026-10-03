"use client";

import { useEffect, useMemo, useState } from "react";
import { locationKey } from "@/lib/website-public/marketplace";

export type GridService = "ONE_WAY" | "ROUNDTRIP" | "TOURS";
export type Catalog = { cities: string[]; routes: Record<string, string[]>; tours: Record<string, { slug: string; name: string; title: string }[]> };
export type CurrentPrice = { vehicleId: string; service: string; city: string; destination: string; packageName: string; status: string; fare: string; baseKm: string; perKm: string; driverAllowance: string; notes: string };
type Cell = { fare: string; baseKm: string; perKm: string; driverAllowance: string; notes: string };
type Row = { key: string; label: string; destination?: string; tour?: string; title?: string };
export type GridRow = { destination?: string; tour?: string; fare?: string; baseKm?: string; perKm?: string; driverAllowance?: string; notes?: string };

const empty: Cell = { fare: "", baseKm: "", perKm: "", driverAllowance: "", notes: "" };
const canonical: Record<GridService, string> = { ONE_WAY: "OUTSTATION_ONE_WAY", ROUNDTRIP: "OUTSTATION_ROUND_TRIP", TOURS: "TOUR_PACKAGE" };
const key = (value: string) => locationKey(value.replace(/\s+/g, " "));
const amount = (value: string) => value.trim() === "" ? "" : String(Number(value));
const control = "min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:bg-slate-100";
const secondary = "min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40";
const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
const complete = (service: GridService, cell: Cell) => service === "ROUNDTRIP" ? [cell.baseKm, cell.perKm, cell.driverAllowance].every(v => v.trim() !== "") : cell.fare.trim() !== "";
const isBlank = (cell: Cell) => [cell.fare, cell.baseKm, cell.perKm, cell.driverAllowance].every(v => v.trim() === "");
const roundtripFare = (cell: Cell) => complete("ROUNDTRIP", cell) ? Math.round((Number(cell.baseKm) * Number(cell.perKm) + Number(cell.driverAllowance)) * 100) / 100 : null;

export function gridRows(service: GridService, catalog: Catalog, city: string): Row[] {
  if (!city) return [];
  if (service === "TOURS") return (catalog.tours[city] || []).map(t => ({ key: t.slug, label: t.name, tour: t.slug, title: t.title }));
  return (catalog.routes[city] || []).map(d => ({ key: key(d), label: d, destination: d }));
}

/** Spreadsheet-style price grid for every published route (or tour) from one pickup city.
 * It prefills the selected cars' current prices; a car-specific difference shows as "Varies"
 * and is left untouched unless edited. Blank rows are sent so those cars stop being offered. */
export function RouteGrid({ service, catalog, city, onCity, prices, selected, busy, writable, onSave }: {
  service: GridService; catalog: Catalog; city: string; onCity: (city: string) => void; prices: CurrentPrice[]; selected: string[]; busy: boolean; writable: boolean; onSave: (rows: GridRow[]) => void;
}) {
  const rows = useMemo(() => gridRows(service, catalog, city), [service, catalog, city]);
  const origins = service === "TOURS" ? catalog.cities : catalog.cities.filter(c => catalog.routes[c]?.length);
  const prefill = useMemo(() => {
    const result: Record<string, { cell: Cell; mixed: boolean }> = {};
    for (const row of rows) {
      const values = selected.map(vehicleId => {
        const price = prices.find(p => p.vehicleId === vehicleId && p.service === canonical[service] && key(p.city) === key(city) && (row.tour ? p.packageName.toLowerCase() === row.title!.toLowerCase() : key(p.destination) === row.key));
        return price ? { fare: service === "ROUNDTRIP" ? "" : amount(price.fare), baseKm: service === "ROUNDTRIP" ? amount(price.baseKm) : "", perKm: service === "ROUNDTRIP" ? amount(price.perKm) : "", driverAllowance: service === "ROUNDTRIP" ? amount(price.driverAllowance) : "", notes: service === "TOURS" ? price.notes : "" } : empty;
      });
      const mixed = new Set(values.map(v => JSON.stringify(v))).size > 1;
      result[row.key] = { cell: mixed ? empty : values[0] || empty, mixed };
    }
    return result;
  }, [rows, prices, selected, service, city]);
  const [cells, setCells] = useState<Record<string, Cell>>({}), [touched, setTouched] = useState<Set<string>>(new Set()), [search, setSearch] = useState("");
  useEffect(() => { setCells(Object.fromEntries(Object.entries(prefill).map(([k, v]) => [k, v.cell]))); setTouched(new Set()); }, [prefill]);
  const cell = (k: string) => cells[k] || empty;
  const update = (k: string, field: keyof Cell, value: string) => { setCells(current => ({ ...current, [k]: { ...(current[k] || empty), [field]: value } })); setTouched(current => new Set(current).add(k)); };
  const sendable = rows.filter(row => !(prefill[row.key]?.mixed && !touched.has(row.key)));
  const priced = rows.filter(row => complete(service, cell(row.key))).length;
  const visible = rows.filter(row => row.label.toLowerCase().includes(search.trim().toLowerCase()));
  const noun = service === "TOURS" ? "tours" : "routes";
  function save(event: React.FormEvent) {
    event.preventDefault();
    onSave(sendable.map(row => {
      const c = cell(row.key);
      return service === "TOURS" ? { tour: row.tour, fare: c.fare.trim(), notes: c.notes.trim() }
        : service === "ROUNDTRIP" ? { destination: row.destination, baseKm: c.baseKm.trim(), perKm: c.perKm.trim(), driverAllowance: c.driverAllowance.trim() }
        : { destination: row.destination, fare: c.fare.trim() };
    }));
  }
  const number = (k: string, field: keyof Cell, label: string, step = "0.01") => <input aria-label={label} className={control} type="number" inputMode="decimal" min="0" step={step} disabled={!writable || busy} placeholder={prefill[k]?.mixed && !touched.has(k) ? "Varies" : ""} value={cell(k)[field]} onChange={e => update(k, field, e.target.value)}/>;
  return <form onSubmit={save} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-semibold">{service === "TOURS" ? "Tour Starting City" : "Pickup City"}
        <select className={`${control} mt-1 min-h-11`} required value={city} onChange={e => { onCity(e.target.value); setSearch(""); }}>
          <option value="">Select {service === "TOURS" ? "starting" : "pickup"} city</option>
          {origins.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {rows.length > 8 && <label className="block text-sm font-semibold">Search {noun}<input className={`${control} mt-1 min-h-11`} value={search} onChange={e => setSearch(e.target.value)} placeholder={service === "TOURS" ? "Search tours" : "Search destinations"}/></label>}
    </div>
    {city && !rows.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">No {noun} from {city} are published in the RideGrid website catalog yet. They appear here automatically once published.</p>}
    {rows.length > 0 && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold" aria-live="polite">{priced} of {rows.length} {noun} priced</p>
        <button type="button" className={secondary} disabled={!writable || busy || !priced} onClick={() => { setCells(Object.fromEntries(rows.map(row => [row.key, service === "TOURS" ? { ...empty, notes: cell(row.key).notes } : empty]))); setTouched(new Set(rows.map(row => row.key))); }}>Clear Prices</button>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50"><tr>{(service === "TOURS" ? ["Tour / Destination", "Price ₹", "Other Notes"] : service === "ROUNDTRIP" ? ["Destination / Visit", "Base KM", "Per KM ₹", "Driver Allowance ₹", "Calculated Fare"] : ["Destination / Route", "One-way Price ₹"]).map(h => <th key={h} className="whitespace-nowrap border-b px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{visible.map(row => {
            const c = cell(row.key), fare = roundtripFare(c), partial = service === "ROUNDTRIP" && !complete(service, c) && !isBlank(c);
            return <tr key={row.key} className="border-b last:border-0">
              <td className="min-w-48 px-3 py-1.5 font-medium">{row.label}{prefill[row.key]?.mixed && !touched.has(row.key) && <small className="block font-normal text-slate-500">Prices differ between selected cars — left unchanged unless edited</small>}</td>
              {service === "ROUNDTRIP" ? <>
                <td className="w-28 px-2 py-1.5">{number(row.key, "baseKm", `Base KM for ${row.label}`, "1")}</td>
                <td className="w-28 px-2 py-1.5">{number(row.key, "perKm", `Per KM for ${row.label}`)}</td>
                <td className="w-36 px-2 py-1.5">{number(row.key, "driverAllowance", `Driver allowance for ${row.label}`)}</td>
                <td className="whitespace-nowrap px-3 py-1.5" aria-label={`Calculated fare for ${row.label}`}>{fare !== null ? <strong>{currency(fare)}</strong> : partial ? <span className="text-amber-700">Incomplete — not offered</span> : <span className="text-slate-400">—</span>}</td>
              </> : <td className="w-40 px-2 py-1.5">{number(row.key, "fare", `${service === "TOURS" ? "Price" : "One-way price"} for ${row.label}`)}</td>}
              {service === "TOURS" && <td className="min-w-56 px-2 py-1.5"><input aria-label={`Notes for ${row.label}`} className={control} maxLength={500} disabled={!writable || busy} value={c.notes} onChange={e => update(row.key, "notes", e.target.value)} placeholder="Optional, shown to customers"/></td>}
            </tr>;
          })}</tbody>
        </table>
        {!visible.length && <p className="p-4 text-sm">No {noun} match this search.</p>}
      </div>
      {service === "ROUNDTRIP" && <p className="text-sm text-slate-600">Calculated Fare = Base KM × Per KM + Driver Allowance, per day. The server recalculates it and applies trip days when quoting. Toll, parking and state tax stay extra as applicable.</p>}
      <p className="text-sm text-slate-600">Blank {service === "ROUNDTRIP" ? "or incomplete " : ""}rows are not offered for the selected cars; an existing price on a cleared row is deactivated when you save.</p>
      <button className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={busy || !writable || !sendable.length}>{busy ? "Saving prices…" : `Save All ${service === "TOURS" ? "Tour" : service === "ROUNDTRIP" ? "Roundtrip" : "One-way"} Prices`}</button>
    </>}
  </form>;
}
