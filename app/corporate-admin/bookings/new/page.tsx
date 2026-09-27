"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, ShieldAlert } from "lucide-react";
import { API, Field, Notice, PageHeader, Panel, apiData, inr, qs, send, useAdminData, useSubmit } from "@/components/corporate-admin/ui";

type Listing = {
  id: string;
  vehicle: { make: string; model: string; category: string; seatingCapacity: number; registrationNumber: string };
  vendor: { companyName: string } | null;
  driver: { name: string; verified: boolean } | null;
  pricing: { pricingPackageId: string; packageName: string; tripDays: number; fare: { finalPayable: string } | null };
  policy: { decision: "ALLOWED" | "APPROVAL_REQUIRED" | "NOT_ALLOWED"; reasons: string[] };
};

type Quote = {
  id: string;
  expiresAt: string;
  vehicleId: string;
  fare: { vendorFare: string; platformFee: string; taxAmount: string; finalPayable: string; tripDateTime: string | null } | null;
  policy: { decision: "ALLOWED" | "APPROVAL_REQUIRED" | "NOT_ALLOWED"; reasons: string[] };
};

const initial = { serviceType: "LOCAL", tripType: "ONEWAY", pickupCity: "", dropCity: "", date: "", time: "", days: "1", category: "", packageName: "" };

function pickupISO(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid pickup date and time.");
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

export default function NewCorporateBookingPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
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
  const [result, setResult] = useState<{ kind: "booked" | "approval"; id: string; label: string } | null>(null);

  const set = (k: keyof typeof initial) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const effectiveTime = form.serviceType === "OUTSTATION" && form.tripType === "ROUNDTRIP" ? "12:00" : form.time;

  async function runSearch() {
    setSearched(true);
    setSelected(null);
    setQuote(null);
    setResult(null);
    await searchSubmit.run(async () => {
      setSearchError("");
      try {
        const data = await apiData<{ listings: Listing[] }>(
          `${API}/booking-search${qs({ serviceType: form.serviceType, tripType: form.tripType, pickupCity: form.pickupCity, dropCity: form.dropCity, date: form.date, time: effectiveTime, days: form.tripType === "ROUNDTRIP" ? form.days : "1", category: form.category, packageName: form.packageName })}`
        );
        setListings(data.listings);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : "Unable to search listings.");
      }
    });
  }

  async function chooseListing(listing: Listing) {
    setSelected(listing);
    setQuote(null);
    setResult(null);
    await quoteSubmit.run(async () => {
      const at = pickupISO(form.date, effectiveTime);
      const q = await send<Quote>("booking-quote", {
        pricingPackageId: listing.pricing.pricingPackageId, at, idempotencyKey: crypto.randomUUID(),
        ...(form.tripType === "ROUNDTRIP" ? { days: form.days } : {}),
      });
      setQuote(q ?? null);
    });
  }

  async function confirm(action: "book" | "approval") {
    if (!selected || !quote) return;
    if (!pickupAddress.trim() || !dropAddress.trim()) { confirmSubmit.setError("Enter pickup and drop addresses."); return; }
    await confirmSubmit.run(async () => {
      const at = pickupISO(form.date, effectiveTime);
      const base = {
        quoteId: quote.id, listingId: selected.id, pricingPackageId: selected.pricing.pricingPackageId,
        pickupDateTime: at, pickupAddress: pickupAddress.trim(), dropAddress: dropAddress.trim(),
      };
      if (action === "book") {
        const booking = await send<{ id: string; bookingNumber: string }>("booking-book", base);
        if (booking) setResult({ kind: "booked", id: booking.id, label: booking.bookingNumber });
      } else {
        const approval = await send<{ id: string }>("booking-approval", { ...base, note: note.trim() });
        if (approval) setResult({ kind: "approval", id: approval.id, label: approval.id });
      }
    });
  }

  return (
    <>
      <PageHeader title="New corporate booking" description="Search, quote and book a ride for your company - always billed to your Corporate Credit Account, exactly like a corporate employee's ride." back={{ href: "/corporate-admin/bookings", label: "Company bookings" }} />

      <Panel title="Search">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Service">
            <select className="rg-input" value={form.serviceType} onChange={set("serviceType")}>
              <option value="LOCAL">Local</option>
              <option value="OUTSTATION">Outstation</option>
            </select>
          </Field>
          <Field label="Trip type">
            <select className="rg-input" value={form.tripType} onChange={set("tripType")}>
              <option value="ONEWAY">One way</option>
              <option value="ROUNDTRIP">Round trip</option>
            </select>
          </Field>
          <Field label="Pickup city"><input className="rg-input" value={form.pickupCity} onChange={set("pickupCity")} /></Field>
          <Field label="Drop city" hint={form.serviceType === "LOCAL" ? "Optional for local rides" : undefined}><input className="rg-input" value={form.dropCity} onChange={set("dropCity")} /></Field>
          <Field label="Date"><input type="date" className="rg-input" value={form.date} onChange={set("date")} /></Field>
          {!(form.serviceType === "OUTSTATION" && form.tripType === "ROUNDTRIP") && (
            <Field label="Time"><input type="time" className="rg-input" value={form.time} onChange={set("time")} /></Field>
          )}
          {form.tripType === "ROUNDTRIP" && <Field label="Days"><input type="number" min={1} max={365} className="rg-input" value={form.days} onChange={set("days")} /></Field>}
          <Field label="Category" hint="Optional"><input className="rg-input" value={form.category} onChange={set("category")} /></Field>
          <Field label="Package name" hint="Optional"><input className="rg-input" value={form.packageName} onChange={set("packageName")} /></Field>
        </div>
        <div className="flex items-center gap-3 border-t border-neutral-100 px-5 py-4">
          <button className="rg-primary" disabled={searchSubmit.busy} onClick={() => void runSearch()}><SearchIcon size={15} />{searchSubmit.busy ? "Searching..." : "Search"}</button>
          {searchError && <span className="text-sm text-red-700">{searchError}</span>}
        </div>
      </Panel>

      {searched && !searchSubmit.busy && (
        <Panel title="Results" description={`${listings.length} matching`}>
          {listings.length === 0
            ? <p className="px-5 py-10 text-center text-sm text-neutral-500">No vehicles matched this search.</p>
            : <div className="grid gap-3 p-5 sm:grid-cols-2">
                {listings.map((l) => (
                  <button key={l.id} onClick={() => void chooseListing(l)} className={`rounded-xl border p-4 text-left transition hover:border-red-300 ${selected?.id === l.id ? "border-red-400 bg-red-50" : "border-neutral-200"}`}>
                    <p className="font-semibold">{l.vehicle.make} {l.vehicle.model}</p>
                    <p className="text-xs text-neutral-500">{l.vehicle.category} · {l.vehicle.seatingCapacity} seats · {l.vendor?.companyName ?? "Vendor"}</p>
                    {l.driver && <p className="text-xs text-neutral-500">Driver: {l.driver.name}{l.driver.verified ? " (verified)" : ""}</p>}
                    <p className="mt-2 text-sm font-semibold">{inr(l.pricing.fare?.finalPayable)}</p>
                    {l.policy.decision === "NOT_ALLOWED" && <p className="mt-1 text-xs font-semibold text-red-700">Not allowed by company policy</p>}
                    {l.policy.decision === "APPROVAL_REQUIRED" && <p className="mt-1 text-xs font-semibold text-amber-700">Needs approval</p>}
                  </button>
                ))}
              </div>}
        </Panel>
      )}

      {selected && (
        <Panel title={`${selected.vehicle.make} ${selected.vehicle.model}`} description={selected.pricing.packageName}>
          <div className="p-5">
            {quoteSubmit.busy && <p className="text-sm text-neutral-500">Getting a fresh price and policy check...</p>}
            {quoteSubmit.error && <Notice tone="error">{quoteSubmit.error}</Notice>}
            {quote && (
              <>
                {quote.policy.decision === "NOT_ALLOWED" ? (
                  <Notice tone="error"><ShieldAlert className="mr-1 inline" size={14} />This ride is not allowed by company travel policy: {quote.policy.reasons.join(", ") || "no reason given"}.</Notice>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-neutral-500">Vendor fare</dt><dd>{inr(quote.fare?.vendorFare)}</dd></div>
                      <div><dt className="text-xs text-neutral-500">Platform fee</dt><dd>{inr(quote.fare?.platformFee)}</dd></div>
                      <div><dt className="text-xs text-neutral-500">Tax</dt><dd>{inr(quote.fare?.taxAmount)}</dd></div>
                      <div><dt className="text-xs text-neutral-500">Total</dt><dd className="font-semibold">{inr(quote.fare?.finalPayable)}</dd></div>
                    </dl>
                    {quote.policy.decision === "APPROVAL_REQUIRED" && <Notice tone="info">This ride needs approval before it is booked: {quote.policy.reasons.join(", ")}.</Notice>}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Pickup address"><input className="rg-input" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Building, street, landmark" /></Field>
                      <Field label="Drop address"><input className="rg-input" value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} placeholder="Building, street, landmark" /></Field>
                    </div>
                    {quote.policy.decision === "APPROVAL_REQUIRED" && (
                      <Field label="Note for the approver" className="mt-3"><textarea className="rg-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                    )}
                    {confirmSubmit.error && <div className="mt-3"><Notice tone="error">{confirmSubmit.error}</Notice></div>}
                    <p className="mt-4 text-xs text-neutral-500">Payment: billed to your company&apos;s Corporate Credit Account. If credit is unavailable or insufficient, booking is blocked - it never falls back to cash or online payment.</p>
                    <div className="mt-3 flex gap-2">
                      {quote.policy.decision === "ALLOWED"
                        ? <button className="rg-primary" disabled={confirmSubmit.busy} onClick={() => void confirm("book")}>{confirmSubmit.busy ? "Booking..." : "Confirm booking"}</button>
                        : <button className="rg-primary" disabled={confirmSubmit.busy} onClick={() => void confirm("approval")}>{confirmSubmit.busy ? "Submitting..." : "Submit for approval"}</button>}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Panel>
      )}

      {result && (
        <Panel title={result.kind === "booked" ? "Booking confirmed" : "Submitted for approval"}>
          <div className="p-5">
            <Notice tone="success">
              {result.kind === "booked" ? `Booking ${result.label} is confirmed, paid by Corporate Credit.` : "This ride was submitted for approval. It will be booked automatically once approved."}
            </Notice>
            <button className="rg-secondary mt-3" onClick={() => router.push(result.kind === "booked" ? `/corporate-admin/bookings/${result.id}` : `/corporate-admin/approvals/${result.id}`)}>
              View {result.kind === "booked" ? "booking" : "approval"}
            </button>
          </div>
        </Panel>
      )}
    </>
  );
}
