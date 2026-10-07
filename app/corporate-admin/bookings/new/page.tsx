"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, CalendarDays, Check, CircleAlert, Clock, Fuel, MapPin, Search as SearchIcon, ShieldAlert, ShieldCheck, UserRound, UserPlus, Users } from "lucide-react";
import { API, apiData, Field, Notice, PageHeader, Panel, Status, inr, qs, send, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Behaviour = { mode: "AUTO_APPROVED" | "APPROVAL_REQUIRED"; policyName: string | null; approvers: string };
type Person = { id: string; name: string; code: string; email: string; mobile: string; designation: string; branch: string | null; department: string | null; canBook: boolean; hasLogin: boolean; approval: Behaviour | null };
type Decision = "ALLOWED" | "APPROVAL_REQUIRED" | "NOT_ALLOWED";
type Listing = {
  id: string;
  vehicle: { make: string; model: string; variant: string | null; category: string; seatingCapacity: number; fuelType: string | null; transmission: string | null; registrationNumber: string };
  vendor: { companyName: string } | null;
  driver: { name: string; verified: boolean } | null;
  pricing: { pricingPackageId: string; packageName: string; tripDays: number; includedKm: number | null; includedHours: number | null; fare: { finalPayable: string } | null };
  policy: { decision: Decision; reasons: string[] };
};
type Quote = {
  id: string; expiresAt: string; vehicleId: string; portalAuthorised?: boolean;
  fare: { vendorFare: string; platformFee: string; taxAmount: string; finalPayable: string; tripDateTime: string | null } | null;
  policy: { decision: Decision; reasons: string[] };
};
type Confirmation = {
  id: string; bookingNumber: string; status: string; pickupDateTime: string; pickupLocation: string; dropLocation: string;
  traveller: { kind: "EMPLOYEE" | "GUEST"; name: string | null; code?: string | null; email: string | null; mobile: string | null; department?: string | null; reference?: string | null };
  bookedBy: string | null; vendor: string; driver: { name: string } | null;
  vehicle: { make: string; model: string; category: string; registrationNumber: string; seatingCapacity: number; fuelType: string | null; transmission: string | null };
  fare: { finalPayable: string }; approvalBasis: string; approval: { id: string; status: string } | null; billing: string;
  notifications: Record<string, Record<string, string>> | null;
};
type Mode = "EMPLOYEE" | "GUEST";
type Service = "ONE_WAY" | "ROUND_TRIP" | "LOCAL";

const SERVICES: { id: Service; label: string; serviceType: "LOCAL" | "OUTSTATION"; tripType: "ONEWAY" | "ROUNDTRIP" }[] = [
  { id: "ONE_WAY", label: "One way", serviceType: "OUTSTATION", tripType: "ONEWAY" },
  { id: "ROUND_TRIP", label: "Round trip", serviceType: "OUTSTATION", tripType: "ROUNDTRIP" },
  { id: "LOCAL", label: "Local / hourly", serviceType: "LOCAL", tripType: "ONEWAY" },
];
const blankTrip = { pickupCity: "", dropCity: "", date: "", time: "", days: "1", category: "", packageName: "" };
const blankGuest = { name: "", mobile: "", email: "", reference: "" };

const BASIS_TEXT: Record<string, string> = { WITHIN_POLICY: "Within company travel policy", ADMIN_AUTHORISED: "Authorised by corporate administrator", APPROVAL_GRANTED: "Approved request" };
const CHANNEL_TEXT: Record<string, string> = {
  SENT: "Sent", AUTOMATION: "Delivered by RideGrid notifications", NOT_CONFIGURED: "Not configured", NOT_CONNECTED: "Not connected", NO_ADDRESS: "No address given",
  FAILED: "Could not be sent", INVALID_RECIPIENT: "Invalid address", PENDING: "Pending",
};
const CHANNEL_NAME: Record<string, string> = { inApp: "In-app", email: "Email", push: "Push", sms: "SMS", whatsapp: "WhatsApp" };

function pickupISO(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid pickup date and time.");
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

function ApprovalChip({ b }: { b: Behaviour | null }) {
  if (!b) return null;
  return b.mode === "AUTO_APPROVED"
    ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-800"><Check size={12}/>Auto-approved by policy</span>
    : <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-800"><ShieldAlert size={12}/>Approval required · {b.approvers}</span>;
}

// Defined at module level so React keeps one instance (and the caret) while the parent re-renders per keystroke.
function EmployeePicker({ selected, onSelect }: { selected: Person | null; onSelect: (p: Person | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(() => {
      setBusy(true); setError("");
      apiData<{ items: Person[] }>(`${API}/booking-travellers${qs({ q })}`)
        .then((d) => { if (live) setItems(d.items); })
        .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Unable to search employees."); })
        .finally(() => { if (live) setBusy(false); });
    }, q ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q, open]);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  return <div ref={box} className="relative">
    <label className="block text-[12.5px] font-semibold text-neutral-700" htmlFor="employee-search">Employee</label>
    <div className="relative mt-1.5">
      <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/>
      <input id="employee-search" className="rg-input pl-9" placeholder="Search by name, email, mobile, employee ID or department" autoComplete="off" role="combobox" aria-expanded={open} aria-controls="employee-results"
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}/>
    </div>
    {open && <div id="employee-results" role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
      {error && <p className="px-3 py-3 text-sm text-red-700">{error}</p>}
      {!error && busy && items.length === 0 && <p className="px-3 py-3 text-sm text-neutral-500">Searching…</p>}
      {!error && !busy && items.length === 0 && <p className="px-3 py-3 text-sm text-neutral-500">No active employees match.</p>}
      {items.map((p) => <button key={p.id} type="button" role="option" aria-selected={selected?.id === p.id} onClick={() => { onSelect(p); setOpen(false); setQ(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-neutral-50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-[12px] font-bold text-red-700">{initials(p.name)}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{p.name} <span className="font-normal text-neutral-500">· {p.code}</span></span><span className="block truncate text-xs text-neutral-500">{[p.designation, p.department].filter(Boolean).join(" · ")}</span></span>
        {!p.hasLogin && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600">No app login</span>}
      </button>)}
    </div>}
  </div>;
}

function SelectedEmployee({ p, onClear }: { p: Person; onClear: () => void }) {
  return <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-[14px] font-bold text-white">{initials(p.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{p.name}</p>
        <p className="truncate text-xs text-neutral-500">{[p.designation, p.department, p.branch].filter(Boolean).join(" · ")}</p>
        <p className="truncate text-xs text-neutral-500">{p.email} · {p.mobile}</p>
      </div>
      <button type="button" className="text-xs font-semibold text-red-600" onClick={onClear}>Change</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {p.approval?.policyName && <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-neutral-700"><ShieldCheck size={12}/>Policy: {p.approval.policyName}</span>}
      <ApprovalChip b={p.approval}/>
    </div>
    {!p.hasLogin && <div className="mt-3"><Notice tone="error">{p.name} has no Corporate Employee App login yet, so a ride booked for them would not appear in their app. <Link className="font-semibold underline" href={`/corporate-admin/employees/${p.id}`}>Create their login</Link> first.</Notice></div>}
    {p.hasLogin && !p.canBook && <div className="mt-3"><Notice tone="error">Booking is switched off for {p.name}. <Link className="font-semibold underline" href={`/corporate-admin/employees/${p.id}`}>Open their profile</Link> to allow it.</Notice></div>}
  </div>;
}

function ListingCard({ l, selected, onPick, disabled }: { l: Listing; selected: boolean; onPick: () => void; disabled: boolean }) {
  const v = l.vehicle;
  const blocked = l.policy.decision === "NOT_ALLOWED";
  return <article className={`rounded-2xl border bg-white p-4 transition ${selected ? "border-red-400 shadow-[0_0_0_3px_rgba(225,29,46,.10)]" : "border-neutral-200 hover:border-neutral-300"} ${blocked ? "opacity-80" : ""}`}>
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 text-neutral-500"><span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">{v.category}</span><span className="mt-0.5 text-[12px] font-semibold text-neutral-700">{v.seatingCapacity} seats</span></div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-bold">{v.make} {v.model}{v.variant ? ` ${v.variant}` : ""}</h3>
        <p className="mt-0.5 text-xs text-neutral-500"><span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-neutral-700">{v.registrationNumber}</span>{v.fuelType ? <span className="ml-2 inline-flex items-center gap-1"><Fuel size={11}/>{v.fuelType}</span> : null}{v.transmission ? <span className="ml-2">{v.transmission}</span> : null}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          {l.driver
            ? <span className="inline-flex items-center gap-1.5 font-semibold"><UserRound size={13} className="text-neutral-400"/>{l.driver.name}{l.driver.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700"><BadgeCheck size={11}/>Verified</span>}</span>
            : <span className="text-neutral-500">Driver assigned by vendor</span>}
          <span className="text-neutral-500">Vendor: <b className="font-semibold text-neutral-700">{l.vendor?.companyName ?? "—"}</b></span>
          <span className="text-neutral-500">{l.pricing.packageName}{l.pricing.includedKm ? ` · ${l.pricing.includedKm} km` : ""}{l.pricing.includedHours ? ` · ${l.pricing.includedHours} hrs` : ""}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {l.policy.decision === "ALLOWED" && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Within policy</span>}
          {l.policy.decision === "APPROVAL_REQUIRED" && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800" title={l.policy.reasons.join(" ")}>Approval may apply</span>}
          {blocked && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800" title={l.policy.reasons.join(" ")}>Not allowed by policy</span>}
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-2">
        <p className="text-[20px] font-bold tabular-nums">{inr(l.pricing.fare?.finalPayable)}</p>
        <button type="button" className="rg-primary" disabled={disabled || blocked} onClick={onPick}>{selected ? "Selected" : "Select"}</button>
      </div>
    </div>
  </article>;
}

export default function NewCorporateBookingPage() {
  const [mode, setMode] = useState<Mode>("EMPLOYEE");
  const [employee, setEmployee] = useState<Person | null>(null);
  const [guest, setGuest] = useState(blankGuest);
  const [service, setService] = useState<Service>("ONE_WAY");
  const [trip, setTrip] = useState(blankTrip);
  const [searched, setSearched] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchError, setSearchError] = useState("");
  const searchSubmit = useSubmit();
  const [selected, setSelected] = useState<Listing | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const quoteSubmit = useSubmit();
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [note, setNote] = useState("");
  const confirmSubmit = useSubmit();
  const [result, setResult] = useState<{ kind: "booked" | "approval"; id: string; notifications?: Confirmation["notifications"] } | null>(null);
  const [done, setDone] = useState<Confirmation | null>(null);
  const { data: config } = useAdminData<{ paymentAvailable: boolean }>(`${API}/booking-config`);

  const svc = SERVICES.find((s) => s.id === service)!;
  const roundTrip = svc.tripType === "ROUNDTRIP";
  const time = svc.serviceType === "OUTSTATION" && roundTrip ? "12:00" : trip.time;
  const guestReady = guest.name.trim().length >= 2 && guest.mobile.replace(/\D/g, "").length >= 10;
  const travellerReady = mode === "EMPLOYEE" ? !!employee && employee.hasLogin && employee.canBook : guestReady;
  const set = (k: keyof typeof blankTrip) => (e: { target: { value: string } }) => setTrip((t) => ({ ...t, [k]: e.target.value }));
  const setG = (k: keyof typeof blankGuest) => (e: { target: { value: string } }) => setGuest((g) => ({ ...g, [k]: e.target.value }));
  const travellerBody = () => mode === "EMPLOYEE" ? { kind: "EMPLOYEE", employeeId: employee!.id } : { kind: "GUEST", guest: { name: guest.name.trim(), mobile: guest.mobile.trim(), email: guest.email.trim(), reference: guest.reference.trim() } };
  const step = result ? 4 : selected ? 4 : searched ? 2 : travellerReady ? 2 : 1;

  function resetRide() { setSelected(null); setQuote(null); setResult(null); setDone(null); confirmSubmit.setError(""); }

  async function runSearch() {
    if (!travellerReady) return;
    setSearched(true); resetRide();
    await searchSubmit.run(async () => {
      setSearchError("");
      try {
        const query = { serviceType: svc.serviceType, tripType: svc.tripType, pickupCity: trip.pickupCity, dropCity: trip.dropCity, date: trip.date, time, days: roundTrip ? trip.days : "1", category: trip.category, packageName: trip.packageName };
        const data = await apiData<{ listings: Listing[] }>(`${API}/booking-search${qs({ ...query, ...(mode === "EMPLOYEE" ? { employeeId: employee!.id } : { guest: "1" }) })}`);
        setListings(data.listings);
      } catch (e) { setListings([]); setSearchError(e instanceof Error ? e.message : "Unable to search listings."); }
    });
  }

  async function chooseListing(l: Listing) {
    setSelected(l); setQuote(null); setResult(null); setDone(null);
    await quoteSubmit.run(async () => {
      const at = pickupISO(trip.date, time);
      const q = await send<Quote>("booking-quote", { traveller: travellerBody(), pricingPackageId: l.pricing.pricingPackageId, at, idempotencyKey: crypto.randomUUID(), ...(roundTrip ? { days: trip.days } : {}) });
      setQuote(q ?? null);
    });
  }

  async function confirm(action: "book" | "approval") {
    if (!selected || !quote) return;
    if (!pickupAddress.trim() || !dropAddress.trim()) { confirmSubmit.setError("Enter pickup and drop addresses."); return; }
    await confirmSubmit.run(async () => {
      const at = pickupISO(trip.date, time);
      const base = { traveller: travellerBody(), quoteId: quote.id, listingId: selected.id, pricingPackageId: selected.pricing.pricingPackageId, pickupDateTime: at, pickupAddress: pickupAddress.trim(), dropAddress: dropAddress.trim() };
      if (action === "book") {
        const booking = await send<{ id: string; bookingNumber: string; notifications?: Confirmation["notifications"] }>("booking-book", base);
        if (booking) {
          setResult({ kind: "booked", id: booking.id, notifications: booking.notifications });
          setDone(await apiData<Confirmation>(`${API}/booking-confirmation${qs({ id: booking.id })}`).catch(() => null));
        }
      } else {
        const approval = await send<{ id: string }>("booking-approval", { ...base, note: note.trim() });
        if (approval) setResult({ kind: "approval", id: approval.id });
      }
    });
  }

  function another() { resetRide(); setSearched(false); setListings([]); setTrip(blankTrip); setPickupAddress(""); setDropAddress(""); setNote(""); setGuest(blankGuest); setEmployee(null); }

  const travellerLabel = mode === "EMPLOYEE" ? employee?.name : guest.name.trim();
  const STEPS = ["Select traveller", "Choose ride", "Trip details", "Confirm & book"];

  return (
    <>
      <PageHeader title="New booking" description="Book the exact car and driver from the live RideGrid marketplace — for an employee or a guest. Always billed to your Corporate Credit Account, at the central price.">
        <Link href="/corporate-admin/bookings" className="rg-secondary">Company bookings</Link>
      </PageHeader>

      {config && !config.paymentAvailable && <Notice tone="error"><CircleAlert className="mr-1 inline" size={14}/>No corporate credit limit is configured, so bookings cannot be confirmed. You can still search; contact RideGrid to set a credit limit.</Notice>}

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <section className="rg-card xl:col-span-5" aria-label="Booking details">
          <div className="p-4">
            <div role="tablist" aria-label="Who is travelling" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
              {([["EMPLOYEE", "Book for employee", Users], ["GUEST", "Book for guest", UserPlus]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); resetRide(); setSearched(false); setListings([]); }} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition ${mode === id ? "bg-red-600 text-white shadow" : "text-neutral-600 hover:text-neutral-900"}`}><Icon size={15}/>{label}</button>
              ))}
            </div>
            <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Progress">
              {STEPS.map((s, i) => <li key={s} className="rgc-step" data-state={i + 1 < step ? "done" : i + 1 === step ? "active" : "todo"}><span>{i + 1 < step ? <Check size={12}/> : i + 1}</span>{s}</li>)}
            </ol>
          </div>

          <div className="space-y-4 border-t border-neutral-100 p-4">
            {mode === "EMPLOYEE" ? <>
              <EmployeePicker selected={employee} onSelect={(p) => { setEmployee(p); resetRide(); setSearched(false); setListings([]); }}/>
              {employee && <SelectedEmployee p={employee} onClear={() => { setEmployee(null); resetRide(); setSearched(false); setListings([]); }}/>}
            </> : <fieldset className="space-y-3">
              <legend className="mb-1 text-[12.5px] font-semibold text-neutral-700">Guest details <span className="font-normal text-neutral-500">· no RideGrid account needed</span></legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name"><input className="rg-input" autoComplete="off" value={guest.name} onChange={setG("name")} maxLength={120}/></Field>
                <Field label="Mobile" hint="Indian numbers are normalised to 10 digits."><input className="rg-input" type="tel" inputMode="tel" autoComplete="off" value={guest.mobile} onChange={setG("mobile")} placeholder="98765 43210"/></Field>
                <Field label="Email" hint="Optional. Booking details are emailed here."><input className="rg-input" type="email" autoComplete="off" value={guest.email} onChange={setG("email")}/></Field>
                <Field label="Reference" hint="Optional, e.g. visit or PO number."><input className="rg-input" autoComplete="off" value={guest.reference} onChange={setG("reference")} maxLength={80}/></Field>
              </div>
              <p className="flex items-center gap-2 text-xs text-neutral-500"><span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">Guest booking</span>Company default travel policy applies. Billed to your company.</p>
            </fieldset>}

            <div role="tablist" aria-label="Service" className="rgc-tabs w-full">
              {SERVICES.map((s) => <button key={s.id} type="button" role="tab" aria-selected={service === s.id} onClick={() => { setService(s.id); resetRide(); }} className="rgc-tab flex-1">{s.label}</button>)}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <Field label={svc.serviceType === "LOCAL" ? "Pickup city" : "From"}><div className="relative"><MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input className="rg-input pl-9" autoComplete="off" value={trip.pickupCity} onChange={set("pickupCity")} placeholder="Bangalore"/></div></Field>
              {svc.serviceType === "OUTSTATION" && <button type="button" aria-label="Swap cities" className="rg-icon hidden sm:inline-flex" onClick={() => setTrip((t) => ({ ...t, pickupCity: t.dropCity, dropCity: t.pickupCity }))}><ArrowLeftRight size={15}/></button>}
              {svc.serviceType === "OUTSTATION" && <Field label="To"><div className="relative"><MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input className="rg-input pl-9" autoComplete="off" value={trip.dropCity} onChange={set("dropCity")} placeholder="Hyderabad"/></div></Field>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Date"><div className="relative"><CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input type="date" className="rg-input pl-9" value={trip.date} onChange={set("date")}/></div></Field>
              {!(svc.serviceType === "OUTSTATION" && roundTrip) && <Field label="Time"><div className="relative"><Clock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input type="time" className="rg-input pl-9" value={trip.time} onChange={set("time")}/></div></Field>}
              {roundTrip && <Field label="Days"><input type="number" min={1} max={365} className="rg-input" value={trip.days} onChange={set("days")}/></Field>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category" hint="Optional, e.g. SUV"><input className="rg-input" autoComplete="off" value={trip.category} onChange={set("category")}/></Field>
              {svc.serviceType === "LOCAL" && <Field label="Package" hint="Optional, e.g. 8 hrs / 80 km"><input className="rg-input" autoComplete="off" value={trip.packageName} onChange={set("packageName")}/></Field>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="rg-primary" disabled={searchSubmit.busy || !travellerReady} onClick={() => void runSearch()}><SearchIcon size={15}/>{searchSubmit.busy ? "Searching…" : "Search available cars"}</button>
              {!travellerReady && <span className="text-xs text-neutral-500">{mode === "EMPLOYEE" ? "Choose an employee first." : "Enter the guest's name and mobile."}</span>}
            </div>
            {searchError && <Notice tone="error">{searchError}</Notice>}
          </div>
        </section>

        <div className="space-y-5 xl:col-span-7">
          {result && result.kind === "booked" ? (
            <section className="rg-card" aria-label="Booking confirmation">
              <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={20}/></span><div><h2 className="text-[17px] font-bold text-emerald-900">Booking confirmed{done ? ` · ${done.bookingNumber}` : ""}</h2><p className="text-xs text-emerald-800">Paid by Corporate Credit · {mode === "GUEST" ? "Guest booking" : `Booked for ${travellerLabel}`}</p></div></div>
              {done ? <div className="grid gap-px bg-neutral-100 sm:grid-cols-2">
                {([
                  ["Traveller", <span key="t">{done.traveller.name}{done.traveller.kind === "GUEST" ? <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Guest</span> : done.traveller.code ? <span className="text-neutral-500"> · {done.traveller.code}</span> : null}</span>],
                  ["Booked by", done.bookedBy ?? "—"],
                  ["Route", <span key="r">{done.pickupLocation}<br/><span className="text-neutral-500">→ {done.dropLocation}</span></span>],
                  ["Pickup", when(done.pickupDateTime)],
                  ["Exact vehicle", `${done.vehicle.make} ${done.vehicle.model} · ${done.vehicle.registrationNumber}`],
                  ["Exact driver", done.driver?.name ?? "Assigned by vendor"],
                  ["Vendor", done.vendor],
                  ["Price", <b key="p">{inr(done.fare.finalPayable)}</b>],
                  ["Policy / approval", BASIS_TEXT[done.approvalBasis] ?? done.approvalBasis],
                  ["Billing", "Corporate Credit Account"],
                ] as [string, React.ReactNode][]).map(([k, v]) => <div key={k} className="bg-white px-5 py-3"><p className="text-[11.5px] font-medium text-neutral-500">{k}</p><p className="mt-0.5 text-[13.5px] font-semibold">{v}</p></div>)}
              </div> : <p className="px-5 py-4 text-sm text-neutral-600">The booking is confirmed. Open it for full details.</p>}
              {result.notifications && <div className="border-t border-neutral-100 px-5 py-4">
                <p className="text-[12.5px] font-bold">Traveller notifications</p>
                <ul className="mt-2 grid gap-1.5 text-[12.5px] sm:grid-cols-2">{Object.entries(Object.values(result.notifications)[0] ?? {}).map(([ch, st]) => <li key={ch} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-1.5"><span className="font-semibold">{CHANNEL_NAME[ch] ?? ch}</span><span className={st === "SENT" || st === "AUTOMATION" ? "text-emerald-700" : "text-neutral-500"}>{CHANNEL_TEXT[st] ?? st}</span></li>)}</ul>
                <p className="mt-2 text-[11.5px] text-neutral-500">{mode === "GUEST" ? "Guest email is sent immediately. SMS and WhatsApp are not connected on this platform yet." : "The employee is notified through RideGrid's notification rules and sees this ride in their Corporate Employee App."}</p>
              </div>}
              <div className="flex flex-wrap gap-2 border-t border-neutral-100 px-5 py-4">
                <Link className="rg-primary" href={`/corporate-admin/bookings/${result.id}`}>View booking</Link>
                <button className="rg-secondary" onClick={another}>Book another ride</button>
                <Link className="rg-secondary" href="/corporate-admin">Return to dashboard</Link>
              </div>
            </section>
          ) : result && result.kind === "approval" ? (
            <section className="rg-card" aria-label="Submitted for approval">
              <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white"><ShieldAlert size={20}/></span><div><h2 className="text-[17px] font-bold text-amber-900">Submitted for approval</h2><p className="text-xs text-amber-800">{mode === "GUEST" ? "Guest booking" : `For ${travellerLabel}`} · routed through your approval workflow</p></div></div>
              <p className="px-5 py-4 text-sm text-neutral-700">The ride is not booked yet. Once the approver approves, open the request and press <b>Complete booking</b> to book it at a fresh price.</p>
              <div className="flex flex-wrap gap-2 border-t border-neutral-100 px-5 py-4">
                <Link className="rg-primary" href={`/corporate-admin/approvals/${result.id}`}>View approval request</Link>
                <button className="rg-secondary" onClick={another}>Book another ride</button>
              </div>
            </section>
          ) : <>
            {searched && !searchSubmit.busy && (
              <Panel title="Available cars" description={`${listings.length} exact car + driver match${listings.length === 1 ? "" : "es"} · live marketplace prices`}>
                {listings.length === 0
                  ? <p className="px-5 py-10 text-center text-sm text-neutral-500">No vehicles matched this search. Try another date, city or category.</p>
                  : <div className="space-y-3 p-4">{listings.map((l) => <ListingCard key={l.id} l={l} selected={selected?.id === l.id} disabled={quoteSubmit.busy} onPick={() => void chooseListing(l)}/>)}</div>}
              </Panel>
            )}
            {!searched && <section className="rg-card rgc-hero p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><SearchIcon size={22}/></span><h2 className="mt-3 text-[16px] font-bold">Exact car. Exact driver.</h2><p className="mx-auto mt-1 max-w-md text-[13px] text-neutral-500">Choose who is travelling, enter the trip and search. You will see the real vehicles, their drivers and vendors, and the central price for the date you pick.</p></section>}

            {selected && (
              <Panel title={`${selected.vehicle.make} ${selected.vehicle.model} · ${selected.vehicle.registrationNumber}`} description={`${selected.pricing.packageName}${selected.driver ? ` · Driver ${selected.driver.name}` : ""}`}>
                <div className="p-5">
                  {quoteSubmit.busy && <p className="text-sm text-neutral-500">Getting a fresh price and policy check…</p>}
                  {quoteSubmit.error && <Notice tone="error">{quoteSubmit.error}</Notice>}
                  {quote && (quote.policy.decision === "NOT_ALLOWED"
                    ? <Notice tone="error"><ShieldAlert className="mr-1 inline" size={14}/>Not allowed by company travel policy: {quote.policy.reasons.join(" ") || "no reason given"}</Notice>
                    : <>
                      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div><dt className="text-xs text-neutral-500">Vendor fare</dt><dd className="font-semibold">{inr(quote.fare?.vendorFare)}</dd></div>
                        <div><dt className="text-xs text-neutral-500">Platform fee</dt><dd className="font-semibold">{inr(quote.fare?.platformFee)}</dd></div>
                        <div><dt className="text-xs text-neutral-500">Tax</dt><dd className="font-semibold">{inr(quote.fare?.taxAmount)}</dd></div>
                        <div><dt className="text-xs text-neutral-500">Total</dt><dd className="text-[18px] font-bold text-red-600">{inr(quote.fare?.finalPayable)}</dd></div>
                      </dl>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <Status value={quote.policy.decision === "ALLOWED" || quote.portalAuthorised ? "ALLOWED" : "APPROVAL_REQUIRED"}/>
                        <span className="text-neutral-600">{quote.policy.decision === "ALLOWED" ? "Within company travel policy." : quote.portalAuthorised ? "Your company approves every trip; as corporate administrator your booking is the approval." : `Needs approval before booking: ${quote.policy.reasons.join(" ")}`}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Field label="Pickup address"><input className="rg-input" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Building, street, landmark"/></Field>
                        <Field label="Drop address"><input className="rg-input" value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} placeholder="Building, street, landmark"/></Field>
                      </div>
                      {quote.policy.decision === "APPROVAL_REQUIRED" && !quote.portalAuthorised && <Field label="Note for the approver" className="mt-3"><textarea className="rg-input" value={note} onChange={(e) => setNote(e.target.value)}/></Field>}
                      {confirmSubmit.error && <div className="mt-3"><Notice tone="error">{confirmSubmit.error}</Notice></div>}
                      <p className="mt-4 text-xs text-neutral-500">Payment: billed to your company&apos;s Corporate Credit Account. If credit is unavailable or insufficient, booking is blocked — it never falls back to cash or online payment.</p>
                      <div className="mt-3 flex gap-2">
                        {quote.policy.decision === "ALLOWED" || quote.portalAuthorised
                          ? <button className="rg-primary" disabled={confirmSubmit.busy} onClick={() => void confirm("book")}>{confirmSubmit.busy ? "Booking…" : `Confirm booking${travellerLabel ? ` for ${travellerLabel.split(" ")[0]}` : ""}`}</button>
                          : <button className="rg-primary" disabled={confirmSubmit.busy} onClick={() => void confirm("approval")}>{confirmSubmit.busy ? "Submitting…" : "Submit for approval"}</button>}
                      </div>
                    </>)}
                </div>
              </Panel>
            )}
          </>}
        </div>
      </div>
    </>
  );
}
