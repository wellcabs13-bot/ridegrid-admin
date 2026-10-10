"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Empty, Kpi, Pill, Section, num, when, words } from "@/components/admin/kit";
import { AlertTriangle, Building2, CarFront, ExternalLink, MapPinOff, Navigation, RefreshCw, Route, UserRound } from "lucide-react";

type Ride = {
  id: string; bookingNumber: string; status: string; tripStatus: string | null; pickupLocation: string; dropLocation: string; pickupDateTime: string;
  customer: string; vendor: string; vehicle: { label: string; registrationNumber: string }; driver: string | null;
  location: { latitude: number; longitude: number; accuracy: number | null; recordedAt: string } | null;
};
type Live = {
  generatedAt: string; shown: number; truncated: boolean;
  kpis: { activeRides: number; onTrip: number; availableDrivers: number; availableVehicles: number; vehiclesOnTrip: number; activeVendors: number; issues: { unassigned24h: number; tripsWithoutLocation: number } };
  rides: Ride[];
};

const TABS = [["ALL", "All rides"], ["TRIP_STARTED", "On trip"], ["DRIVER_ASSIGNED", "Assigned"]] as const;
const ago = (iso: string) => { const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)); return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`; };

export default function LiveOperationsPage() {
  const { data, loading, error, reload } = useAdminData<Live>("/api/admin/live-operations");
  const [live, setLive] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Live view re-reads the same endpoint; nothing is pushed or simulated.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") void reload(); }, 30000);
    return () => clearInterval(id);
  }, [live, reload]);
  const rides = useMemo(() => (data?.rides ?? []).filter(r => tab === "ALL" || r.status === tab), [data, tab]);
  const selected = data?.rides.find(r => r.id === selectedId) ?? null;
  const k = data?.kpis;
  const issues = k ? k.issues.unassigned24h + k.issues.tripsWithoutLocation : 0;
  const mapSrc = selected?.location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.location.longitude - 0.012}%2C${selected.location.latitude - 0.007}%2C${selected.location.longitude + 0.012}%2C${selected.location.latitude + 0.007}&layer=mapnik&marker=${selected.location.latitude}%2C${selected.location.longitude}`
    : null;
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Live Operations" description="Active and imminent rides with their assigned driver and exact vehicle. Positions appear only when the Driver App has sent a fresh, verified location.">
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">
        <span className={`relative h-5 w-9 rounded-full transition ${live ? "bg-emerald-500" : "bg-neutral-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${live ? "left-[18px]" : "left-0.5"}`} /></span>
        <input type="checkbox" className="sr-only !min-h-0" checked={live} onChange={e => setLive(e.target.checked)} aria-label="Live view: refresh every 30 seconds" />
        Live view{live && <span className="font-normal text-neutral-500">· 30s</span>}
      </label>
      <button className="rg-secondary" onClick={reload} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button>
    </PageHeading>
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && k && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Route} accent="green" label="Active rides" value={num(k.activeRides)} hint="On trip or starting within 24h" href="/bookings?status=TRIP_STARTED" />
        <Kpi icon={Navigation} accent="amber" label="On trip" value={num(k.onTrip)} hint="Trip started" href="/bookings?status=TRIP_STARTED" />
        <Kpi icon={UserRound} accent="blue" label="Available drivers" value={num(k.availableDrivers)} hint="Active, not on a trip" href="/drivers" />
        <Kpi icon={CarFront} accent="green" label="Available vehicles" value={num(k.availableVehicles)} hint={`${num(k.vehiclesOnTrip)} on trip`} href="/vehicles" />
        <Kpi icon={Building2} accent="violet" label="Active vendors" value={num(k.activeVendors)} href="/vendors" />
        <Kpi icon={AlertTriangle} accent="red" label="Live issues" value={num(issues)} tone={issues ? "warn" : "good"} hint={issues ? `${k.issues.unassigned24h} unassigned ≤24h · ${k.issues.tripsWithoutLocation} no location` : "Nothing needs attention"} href={k.issues.unassigned24h ? "/bookings?status=CONFIRMED" : undefined} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Section title="Live map" description={selected ? `${selected.bookingNumber} · ${selected.vehicle.label}` : "Select a ride to see its verified position"}
          actions={selected?.location ? <a className="rg-secondary !px-3 !py-1.5 !text-xs" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${selected.location.latitude},${selected.location.longitude}`}><ExternalLink size={13} />Open in Maps</a> : undefined}>
          {mapSrc && selected?.location ? <div>
            <iframe title={`Live position of ${selected.bookingNumber}`} src={mapSrc} className="h-[420px] w-full border-0" loading="lazy" referrerPolicy="no-referrer" />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500"><span>Last verified location {ago(selected.location.recordedAt)} · {when(selected.location.recordedAt)}</span>{selected.location.accuracy != null && <span>Accuracy ±{Math.round(selected.location.accuracy)} m</span>}</div>
          </div> : <div className="flex h-[420px] flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm"><MapPinOff size={24} /></span>
            <p className="text-sm font-semibold">{selected ? "No verified live location for this ride" : "Choose a ride from the list"}</p>
            <p className="max-w-sm text-xs leading-5 text-neutral-500">{selected ? "The Driver App has not sent a fresh location (within 2 minutes) that matches this trip, driver and vehicle. The map stays empty rather than guessing." : "The map shows a ride only when the assigned driver’s app has reported a fresh, verified position."}</p>
          </div>}
        </Section>
        <Section title={`Rides (${num(data.shown)}${data.truncated ? "+" : ""})`} description={`Updated ${when(data.generatedAt)}`}>
          <div className="flex gap-1.5 border-b border-neutral-100 px-4 py-2.5" role="tablist" aria-label="Ride filter">
            {TABS.map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === v ? "bg-red-600 !text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{l}</button>)}
          </div>
          {rides.length ? <ul className="max-h-[470px] divide-y divide-neutral-100 overflow-y-auto">{rides.map(r => <li key={r.id}>
            <button onClick={() => setSelectedId(r.id)} aria-pressed={selectedId === r.id} className={`block w-full px-4 py-3 text-left transition hover:bg-neutral-50 ${selectedId === r.id ? "bg-red-50/60" : ""}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-neutral-500">{r.bookingNumber}</span><Pill value={r.status} label={words(r.tripStatus ?? r.status)} /></div>
              <p className="mt-1 truncate text-sm font-semibold">{r.customer}</p>
              <p className="truncate text-xs text-neutral-500">{r.pickupLocation} → {r.dropLocation}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                <span>{r.driver ?? "No driver"}</span><span>{r.vehicle.label} · {r.vehicle.registrationNumber}</span><span>{when(r.pickupDateTime)}</span>
                <span className={r.location ? "font-semibold text-emerald-600" : r.status === "TRIP_STARTED" ? "font-semibold text-amber-600" : ""}>{r.location ? `Location ${ago(r.location.recordedAt)}` : "No live location"}</span>
              </div>
            </button>
            <div className="flex justify-end px-4 pb-2"><Link href={`/bookings?id=${r.id}`} className="rg-outline">View booking</Link></div>
          </li>)}</ul> : <Empty title="No rides in this view" text="Rides appear here when a driver is assigned within the next 24 hours or a trip has started." />}
          {data.truncated && <p className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-500">Showing the first {data.shown} of {num(k.activeRides)} rides. Open Bookings for the full list.</p>}
        </Section>
      </div>
    </>}</DataState>
  </div></DashboardLayout>;
}
