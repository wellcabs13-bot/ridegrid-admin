"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Confirm, Drawer, Empty, Field, Notice, Pager, Pill, Rows, Section, Select, inr, send, when, words } from "@/components/admin/kit";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Plus, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

type Row = {
  id: string; bookingNumber: string; source: string; sourceLabel: string; status: string; tripType: string;
  pickupLocation: string; dropLocation: string; pickupDateTime: string; createdAt: string; archivedAt: string | null; holdExpired: boolean;
  customer: { id: string; name: string; email: string; mobile: string | null };
  corporate: { id: string; companyName: string } | null; vendor: { id: string; companyName: string };
  vehicle: { id: string; label: string; registrationNumber: string; category: string }; driver: { id: string; name: string } | null;
  fare: { total: number; gst: number | null; platformFee: number | null; vendorAmount: number | null };
  payment: { method: string; status: string; amount: number; reference: string | null; gateway: string | null } | null;
};
type ListResult = { rows: Row[]; total: number; page: number; pageSize: number; totalPages: number; statusCounts?: Record<string, number> };
// Status tabs; the remaining statuses (Pending, Awaiting payment) stay in the status select.
const TABS: [string, string][] = [["", "All"], ["CONFIRMED", "Confirmed"], ["DRIVER_ASSIGNED", "Driver assigned"], ["TRIP_STARTED", "Ongoing"], ["TRIP_COMPLETED", "Completed"], ["CANCELLED", "Cancelled"]];
type Option = { id: string; label: string };
type Options = { vendors: Option[]; corporates: Option[]; vehicles: Option[]; drivers: Option[] };

const FILTER_KEYS = ["q", "customer", "from", "to", "dateField", "source", "status", "paymentStatus", "segment", "corporateId", "vendorId", "vehicleId", "driverId", "archived"] as const;
type Filters = Record<(typeof FILTER_KEYS)[number], string>;
const EMPTY: Filters = Object.fromEntries(FILTER_KEYS.map(k => [k, ""])) as Filters;

const STATUSES = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED", "TRIP_COMPLETED", "CANCELLED"];
const PAYMENTS = ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIAL"];
const SOURCES = [{ value: "WEBSITE", label: "Retail Website" }, { value: "APP", label: "Customer App" }, { value: "CORPORATE", label: "Corporate (Portal / Employee)" }];

export default function BookingsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResult | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const initial = { ...EMPTY };
    for (const k of FILTER_KEYS) initial[k] = url.get(k) ?? "";
    if (url.get("search")) initial.q = url.get("search") ?? "";
    setFilters(initial); setApplied(initial);
    if (url.get("id")) setSelected(url.get("id"));
    send<Options>("/api/admin/bookings?options=1", "GET").then(setOptions).catch(() => setOptions({ vendors: [], corporates: [], vehicles: [], drivers: [] }));
  }, []);

  const query = useMemo(() => {
    if (!applied) return null;
    const p = new URLSearchParams();
    for (const k of FILTER_KEYS) if (applied[k]) p.set(k, applied[k]);
    p.set("page", String(page));
    return p.toString();
  }, [applied, page]);

  const load = useCallback(async () => {
    if (query === null) return;
    setLoading(true); setError("");
    try { setData(await send<ListResult>(`/api/admin/bookings?${query}`, "GET")); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load bookings."); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof Filters, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const apply = () => { setPage(1); setApplied({ ...filters }); };
  const reset = () => { setFilters(EMPTY); setPage(1); setApplied(EMPTY); };
  const opt = (list?: Option[]) => (list ?? []).map(o => ({ value: o.id, label: o.label }));
  const pick = (status: string) => { const next = { ...(applied ?? filters), status }; setFilters(f => ({ ...f, status })); setApplied(next); setPage(1); };
  const advanced = (["source", "paymentStatus", "segment", "corporateId", "vendorId", "vehicleId", "driverId", "customer", "archived"] as const).filter(k => applied?.[k]).length;
  const counts = data?.statusCounts;
  const countFor = (v: string) => (counts ? (v ? counts[v] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0)) : null);

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Bookings Management" description="Every retail and corporate booking from the central booking table. Cancel, correct and archive through controlled, audited actions.">
      <button className="rg-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button>
      <Link href="/marketplace/booking" className="rg-primary"><Plus size={15} />New Booking</Link>
    </PageHeading>
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}

    <section className="rg-card">
      <div role="tablist" aria-label="Booking status" className="flex gap-1 overflow-x-auto border-b border-neutral-100 p-2">
        {TABS.map(([v, l]) => { const on = (applied?.status ?? "") === v; const c = countFor(v); return <button key={v || "all"} role="tab" aria-selected={on} onClick={() => pick(v)} className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${on ? "bg-red-600 !text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100"}`}>{l}{c !== null && <span className={`ml-1.5 text-xs font-medium ${on ? "text-red-100" : "text-neutral-400"}`}>({c.toLocaleString("en-IN")})</span>}</button>; })}
      </div>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 focus-within:border-red-500"><Search size={15} className="text-neutral-400" /><input aria-label="Search bookings" className="!min-h-0 !border-0 !bg-transparent !p-0 !py-2 min-w-0 w-full" value={filters.q} onChange={e => set("q", e.target.value)} onKeyDown={e => { if (e.key === "Enter") apply(); }} placeholder="Search booking no., route or vehicle…" /></label>
          <span className="flex items-center gap-2 text-xs font-medium text-neutral-500"><input aria-label="From date" type="date" className="rg-input !w-auto" value={filters.from} onChange={e => set("from", e.target.value)} />–<input aria-label="To date" type="date" className="rg-input !w-auto" value={filters.to} onChange={e => set("to", e.target.value)} /></span>
          <select aria-label="Date applies to" className="rg-input !w-auto" value={filters.dateField} onChange={e => set("dateField", e.target.value)}><option value="">Pickup date</option><option value="created">Booked on</option></select>
          <select aria-label="Status" className="rg-input !w-auto" value={filters.status} onChange={e => set("status", e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{words(s)}</option>)}</select>
          <button type="button" className="rg-secondary" aria-expanded={showFilters} aria-controls="booking-filters" onClick={() => setShowFilters(v => !v)}><SlidersHorizontal size={14} />Filters{advanced > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{advanced}</span>}</button>
          <button type="button" className="rg-primary" onClick={apply}>Apply</button>
          <button type="button" className="rg-secondary" onClick={reset}>Reset</button>
        </div>
        {showFilters && <form id="booking-filters" className="grid gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" onSubmit={e => { e.preventDefault(); apply(); }}> <Field label="Customer (name, email, mobile)"><input className="rg-input" value={filters.customer} onChange={e => set("customer", e.target.value)} /></Field> <Field label="Payment"><Select value={filters.paymentStatus} onChange={v => set("paymentStatus", v)} options={PAYMENTS.map(s => ({ value: s, label: words(s) }))} /></Field> <Field label="Source"><Select value={filters.source} onChange={v => set("source", v)} options={SOURCES} /></Field> <Field label="Retail / Corporate"><Select value={filters.segment} onChange={v => set("segment", v)} options={[{ value: "RETAIL", label: "Retail" }, { value: "CORPORATE", label: "Corporate" }]} /></Field> <Field label="Company"><Select value={filters.corporateId} onChange={v => set("corporateId", v)} options={opt(options?.corporates)} /></Field> <Field label="Vendor"><Select value={filters.vendorId} onChange={v => set("vendorId", v)} options={opt(options?.vendors)} /></Field> <Field label="Vehicle"><Select value={filters.vehicleId} onChange={v => set("vehicleId", v)} options={opt(options?.vehicles)} /></Field> <Field label="Driver"><Select value={filters.driverId} onChange={v => set("driverId", v)} options={opt(options?.drivers)} /></Field> <Field label="View"><select className="rg-input" value={filters.archived} onChange={e => set("archived", e.target.value)}><option value="">Active records</option><option value="1">Archived records</option></select></Field> <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2"><button type="submit" className="rg-primary">Apply filters</button><button type="button" className="rg-secondary" onClick={reset}>Reset</button></div> </form>}
      </div>
    </section>

    {error ? <Notice tone="error">{error} <button className="ml-2 underline" onClick={() => void load()}>Retry</button></Notice> :
      <section className="rg-card">
        {loading && !data ? <p className="p-10 text-center text-sm text-neutral-500">Loading bookings…</p> :
          !data?.rows.length ? <Empty title="No bookings match these filters" text="Adjust or reset the filters. New bookings appear here as soon as they are created." /> :
            <div className="overflow-x-auto"><table className="rg-table min-w-[1080px]">
              <thead><tr><th>Booking</th><th>Customer</th><th>Route</th><th>Vendor · Vehicle · Driver</th><th>Pickup</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">Action</th></tr></thead>
              <tbody>{data.rows.map(b => <tr key={b.id} className="cursor-pointer" onClick={() => setSelected(b.id)}>
                <td><button className="font-semibold text-red-600 hover:underline" onClick={e => { e.stopPropagation(); setSelected(b.id); }}>{b.bookingNumber}</button><p className="text-[11px] text-neutral-500">{b.sourceLabel} · {words(b.tripType)}</p></td>
                <td><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">{b.customer.name.slice(0, 1).toUpperCase() || "?"}</span><div className="min-w-0"><p className="truncate font-medium">{b.customer.name}</p><p className="truncate text-xs text-neutral-500">{b.corporate ? b.corporate.companyName : b.customer.mobile || b.customer.email}</p></div></div></td>
                <td className="max-w-[240px]"><p className="truncate" title={b.pickupLocation}>{b.pickupLocation}</p><p className="truncate text-xs text-neutral-500" title={b.dropLocation}>→ {b.dropLocation}</p></td>
                <td><p>{b.vendor.companyName}</p><p className="text-xs text-neutral-500">{b.vehicle.label} · {b.vehicle.registrationNumber}</p><p className="text-xs text-neutral-500">{b.driver?.name ?? "No driver"}</p></td>
                <td className="whitespace-nowrap text-[13px]">{when(b.pickupDateTime)}<p className="text-[11px] text-neutral-500">Booked {when(b.createdAt, false)}</p></td>
                <td><Pill value={b.status} />{b.holdExpired && <p className="mt-1 text-[11px] text-neutral-500">Hold expired</p>}<p className="mt-1 text-[11px] text-neutral-500">{b.payment ? <>{words(b.payment.status)} · {b.payment.method === "CORPORATE_CREDIT" ? "Corporate Credit" : b.payment.gateway === "PAYU" ? `PayU · ${words(b.payment.method)}` : words(b.payment.method)}</> : "No payment record"}</p></td>
                <td className="text-right"><p className="font-bold">{inr(b.fare.total)}</p><p className="text-[11px] text-neutral-500">GST {inr(b.fare.gst)}</p></td>
                <td className="text-right"><button className="rg-outline" onClick={e => { e.stopPropagation(); setSelected(b.id); }}>View</button></td>
              </tr>)}</tbody>
            </table></div>}
        {data && data.rows.length > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
      </section>}

    <BookingDrawer id={selected} onClose={() => setSelected(null)} onChanged={msg => { setNotice(msg); void load(); }} />
  </div></DashboardLayout>;
}

type Detail = {
  id: string; bookingNumber: string; sourceLabel: string; status: string; tripType: string; tripDays: number;
  pickupLocation: string; dropLocation: string; pickupDateTime: string; reservedFrom: string | null; reservedUntil: string | null;
  holdExpiresAt: string | null; createdAt: string; archivedAt: string | null;
  customer: { id: string; name: string; email: string; mobile: string | null; role: string; active: boolean };
  corporate: { id: string; companyName: string; status: string } | null;
  employee: { employeeName: string; employeeCode: string; designation: string; department: { departmentName: string } | null; branch: { branchName: string } | null } | null;
  approval: { id: string; status: string; amount: string | null; createdAt: string } | null;
  vendor: { id: string; companyName: string; contact: string; email: string; mobile: string | null; verified: boolean; suspended: boolean };
  vehicle: { make: string; model: string; variant: string | null; registrationNumber: string; category: string; seatingCapacity: number; status: string };
  driver: { id: string; name: string; status: string; mobile: string | null } | null;
  pricingPackage: { packageName: string; packageType: string } | null;
  fare: { snapshotAvailable: boolean; vendorFare: number | null; platformFee: number | null; gst: number | null; passThrough: number | null; discount: number | null; total: number; vendorAmount: number | null; rideGridRevenue: number | null; taxComponents: { name: string; rate: string; amount: string }[] | null };
  cancellation: { reason: string | null; cancelledAt: string | null; cancelledBy: string | null; charge: number | null; refundAmount: number | null } | null;
  transactions: { id: string; transactionType: string; paymentMethod: string; paymentStatus: string; amount: number; referenceNumber: string | null; gatewayName: string | null; gatewayTransactionId: string | null; remarks: string | null; createdAt: string }[];
  statusHistory: { id: string; previousStatus: string | null; currentStatus: string; action: string; changedBy: string; remarks: string | null; changedAt: string }[];
  trip: { status: string } | null; invoice: { invoiceNumber: string; totalAmount: number; paymentStatus: string } | null;
  audit: { id: string; action: string; newValue: Record<string, unknown> | null; createdAt: string; user: { name: string; role: string } | null }[];
  events: { id: string; eventType: string; status: string; errorMessage: string | null; createdAt: string }[];
  allowed: { edit: boolean; cancel: boolean; archive: boolean; restore: boolean };
};

function toLocal(value: string) {
  const d = new Date(value);
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

function BookingDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: (message: string) => void }) {
  const { user } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirm, setConfirm] = useState<"cancel" | "archive" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; label: string }[]>([]);
  const [form, setForm] = useState({ pickupLocation: "", dropLocation: "", pickupDateTime: "", driverId: "", reason: "" });

  const load = useCallback(async () => {
    if (!id) return;
    setError(""); setD(null);
    try { setD(await send<Detail>(`/api/admin/bookings/${id}`, "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load booking."); }
  }, [id]);
  useEffect(() => { setMode("view"); void load(); }, [load]);

  const startEdit = async () => {
    if (!d) return;
    setForm({ pickupLocation: d.pickupLocation, dropLocation: d.dropLocation, pickupDateTime: toLocal(d.pickupDateTime), driverId: d.driver?.id ?? "", reason: "" });
    setActionError(""); setMode("edit");
    try { setDrivers((await send<{ drivers: { id: string; label: string }[] }>(`/api/admin/bookings/${d.id}?editOptions=1`, "GET")).drivers); } catch { setDrivers([]); }
  };

  const save = async () => {
    if (!d) return;
    setBusy(true); setActionError("");
    try {
      const body: Record<string, string> = { reason: form.reason };
      if (form.pickupLocation !== d.pickupLocation) body.pickupLocation = form.pickupLocation;
      if (form.dropLocation !== d.dropLocation) body.dropLocation = form.dropLocation;
      if (form.pickupDateTime !== toLocal(d.pickupDateTime)) body.pickupDateTime = new Date(`${form.pickupDateTime}:00+05:30`).toISOString();
      if (form.driverId && form.driverId !== d.driver?.id) body.driverId = form.driverId;
      await send(`/api/admin/bookings/${d.id}`, "PATCH", body);
      setMode("view"); onChanged(`${d.bookingNumber} updated.`); await load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Update failed."); } finally { setBusy(false); }
  };

  const act = async (action: "cancel" | "archive" | "restore", reason: string) => {
    if (!d) return;
    setBusy(true); setActionError("");
    try {
      const r = await send<{ refundState?: string; refundAmount?: number }>(`/api/admin/bookings/${d.id}`, "POST", { action, reason });
      setConfirm(null);
      const extra = r.refundState === "CORPORATE_CREDIT_RESTORED" ? ` Corporate credit of ${inr(r.refundAmount)} restored.` : r.refundState === "REFUND_DUE" ? ` A refund of ${inr(r.refundAmount)} is now due in Finance.` : "";
      onChanged(`${d.bookingNumber} ${action === "cancel" ? "cancelled" : action === "archive" ? "archived" : "restored"}.${extra}`);
      if (action === "archive") onClose(); else await load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Action failed."); } finally { setBusy(false); }
  };

  const footer = d && mode === "view" ? <>
    {d.allowed.edit && <button className="rg-secondary" onClick={() => void startEdit()}>Correct booking</button>}
    {d.allowed.cancel && <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setActionError(""); setConfirm("cancel"); }}>Cancel booking</button>}
    {d.allowed.archive && user?.role === "SUPER_ADMIN" && <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm("archive"); }}>Archive</button>}
    {d.allowed.restore && user?.role === "SUPER_ADMIN" && <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm("restore"); }}>Restore</button>}
  </> : d && mode === "edit" ? <><button className="rg-secondary" onClick={() => setMode("view")} disabled={busy}>Back</button><button className="rg-primary" onClick={() => void save()} disabled={busy || !form.reason.trim()}>{busy ? "Saving…" : "Save correction"}</button></> : null;

  return <Drawer open={!!id} onClose={onClose} title={d ? d.bookingNumber : "Booking"} subtitle={d ? <span className="flex flex-wrap items-center gap-2"><Pill value={d.status} /><span>{d.sourceLabel}</span>{d.archivedAt && <Pill value="DELETED" label={`Archived ${when(d.archivedAt, false)}`} />}</span> : undefined} footer={footer}>
    {error && <Notice tone="error">{error}</Notice>}
    {!d && !error && <p className="text-sm text-neutral-500">Loading booking…</p>}
    {actionError && mode === "edit" && <Notice tone="error">{actionError}</Notice>}
    {d && mode === "edit" && <Section title="Controlled correction" description="Addresses, pickup time on the same day, and driver (same vendor). Changing the date, vehicle, vendor or fare requires cancel and rebook so payments stay consistent.">
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Pickup location"><input className="rg-input" value={form.pickupLocation} onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))} /></Field>
        <Field label="Drop location"><input className="rg-input" value={form.dropLocation} onChange={e => setForm(f => ({ ...f, dropLocation: e.target.value }))} /></Field>
        <Field label="Pickup time (IST)" hint="Same calendar day only"><input type="datetime-local" className="rg-input" value={form.pickupDateTime} onChange={e => setForm(f => ({ ...f, pickupDateTime: e.target.value }))} /></Field>
        <Field label="Driver" hint="Active drivers of this vendor; availability is re-checked"><select className="rg-input" value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}>{!drivers.some(x => x.id === form.driverId) && form.driverId && <option value={form.driverId}>{d.driver?.name}</option>}{drivers.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Reason for the change (audited)"><textarea className="rg-input" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></Field></div>
      </div>
    </Section>}
    {d && mode === "view" && <>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Passenger"><div className="px-5 py-3"><Rows items={[["Name", d.customer.name], ["Email", d.customer.email], ["Mobile", d.customer.mobile ?? "—"], ["Account", d.customer.active ? "Active" : "Inactive / deleted"]]} /></div></Section>
        <Section title={d.corporate ? "Corporate context" : "Booking"}><div className="px-5 py-3"><Rows items={d.corporate ? [["Company", d.corporate.companyName], ["Employee", d.employee ? `${d.employee.employeeName} (${d.employee.employeeCode})` : "—"], ["Department / Branch", d.employee ? `${d.employee.department?.departmentName ?? "—"} / ${d.employee.branch?.branchName ?? "—"}` : "—"], ["Approval", d.approval ? `${words(d.approval.status)} · ${when(d.approval.createdAt, false)}` : "Within policy (no approval)"]] : [["Source", d.sourceLabel], ["Booked", when(d.createdAt)], ["Trip type", `${words(d.tripType)} · ${d.tripDays} day(s)`], ["Package", d.pricingPackage?.packageName ?? "—"]]} /></div></Section>
        <Section title="Trip"><div className="px-5 py-3"><Rows items={[["Pickup", d.pickupLocation], ["Drop", d.dropLocation], ["Pickup time", when(d.pickupDateTime)], ["Reserved", d.reservedFrom ? `${when(d.reservedFrom, false)} – ${when(d.reservedUntil, false)}` : "—"], ["Trip progress", d.trip ? words(d.trip.status) : "Not started"], ...(d.holdExpiresAt ? [["Payment hold until", when(d.holdExpiresAt)] as [string, string]] : [])]} /></div></Section>
        <Section title="Vendor · Vehicle · Driver"><div className="px-5 py-3"><Rows items={[["Vendor", <span key="v">{d.vendor.companyName} {d.vendor.verified && <Pill value="VERIFIED" />} {d.vendor.suspended && <Pill value="SUSPENDED" />}</span>], ["Vendor contact", `${d.vendor.contact} · ${d.vendor.mobile ?? d.vendor.email}`], ["Vehicle", `${d.vehicle.make} ${d.vehicle.model} · ${d.vehicle.registrationNumber}`], ["Category", `${words(d.vehicle.category)} · ${d.vehicle.seatingCapacity} seats`], ["Driver", d.driver ? `${d.driver.name}${d.driver.mobile ? ` · ${d.driver.mobile}` : ""}` : "Not assigned"]]} /></div></Section>
      </div>
      <Section title="Fare breakdown" description={d.fare.snapshotAvailable ? "From the booking's authoritative pricing snapshot" : "Historical pricing details unavailable: this booking predates pricing snapshots. Only the stored fare fields are shown; platform fee and RideGrid revenue are unknown and excluded from component totals."}>
        <div className="px-5 py-3"><Rows items={[["Vendor fare", inr(d.fare.vendorFare, 2)], ["Platform fee", inr(d.fare.platformFee, 2)], ...((d.fare.taxComponents ?? []).map(t => [`${t.name} @ ${t.rate}%`, inr(t.amount, 2)] as [string, string])), ["GST total", inr(d.fare.gst, 2)], ["Tolls / pass-through", inr(d.fare.passThrough, 2)], ["Discount", d.fare.discount ? `− ${inr(d.fare.discount, 2)}` : "—"], ["Total payable", <strong key="t">{inr(d.fare.total, 2)}</strong>], ["Vendor amount", inr(d.fare.vendorAmount, 2)], ["RideGrid revenue (net)", inr(d.fare.rideGridRevenue, 2)]]} /></div>
      </Section>
      {d.cancellation && <Section title="Cancellation"><div className="px-5 py-3"><Rows items={[["Reason", d.cancellation.reason ?? "—"], ["Cancelled", when(d.cancellation.cancelledAt)], ["By", d.cancellation.cancelledBy ?? "—"], ["Refunded", inr(d.cancellation.refundAmount, 2)]]} /></div></Section>}
      <Section title="Payments & transactions">{d.transactions.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Type</th><th>Method</th><th>Status</th><th>Reference</th><th className="text-right">Amount</th><th>Created</th></tr></thead><tbody>{d.transactions.map(t => <tr key={t.id}><td>{words(t.transactionType)}</td><td>{t.paymentMethod === "CORPORATE_CREDIT" ? "Corporate Credit" : `${t.gatewayName === "PAYU" ? "PayU · " : ""}${words(t.paymentMethod)}`}</td><td><Pill value={t.paymentStatus} /></td><td className="text-xs">{t.gatewayTransactionId || t.referenceNumber || "—"}{t.remarks && <p className="text-neutral-500">{t.remarks}</p>}</td><td className="text-right">{inr(t.amount, 2)}</td><td className="text-xs">{when(t.createdAt)}</td></tr>)}</tbody></table></div> : <Empty title="No payment records" />}{d.invoice && <p className="px-5 pb-3 text-xs text-neutral-500">Invoice {d.invoice.invoiceNumber} · {inr(d.invoice.totalAmount, 2)} · {words(d.invoice.paymentStatus)}</p>}</Section>
      <Section title="Status history">{d.statusHistory.length ? <ol className="space-y-2 px-5 py-3 text-sm">{d.statusHistory.map(h => <li key={h.id} className="flex flex-wrap items-baseline gap-2"><span className="text-xs text-neutral-500">{when(h.changedAt)}</span><Pill value={h.currentStatus} /><span className="text-xs">{words(h.action)} · {h.changedBy}</span>{h.remarks && <span className="text-xs text-neutral-500">— {h.remarks}</span>}</li>)}</ol> : <Empty title="No status history" />}</Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Admin audit">{d.audit.length ? <ul className="space-y-2 px-5 py-3 text-xs">{d.audit.map(a => <li key={a.id}><span className="text-neutral-500">{when(a.createdAt)}</span> · {a.user?.name ?? "System"} · {words(a.action)} {a.newValue && typeof a.newValue === "object" && "reason" in a.newValue && a.newValue.reason ? `— ${String(a.newValue.reason)}` : ""}</li>)}</ul> : <Empty title="No admin changes" />}</Section>
        <Section title="Events & notifications">{d.events.length ? <ul className="space-y-2 px-5 py-3 text-xs">{d.events.map(e => <li key={e.id}><span className="text-neutral-500">{when(e.createdAt)}</span> · {words(e.eventType)} · <Pill value={e.status} />{e.errorMessage && <span className="text-red-700"> {e.errorMessage}</span>}</li>)}</ul> : <Empty title="No events recorded" />}</Section>
      </div>
    </>}
    <Confirm open={confirm === "cancel"} title={`Cancel ${d?.bookingNumber ?? ""}?`} danger requireReason busy={busy} error={actionError} confirmLabel="Cancel booking"
      message={<>The vehicle and driver are released immediately. {d?.transactions.some(t => t.paymentStatus === "PAID" && t.paymentMethod === "CORPORATE_CREDIT") ? "Corporate credit used by this booking will be restored." : d?.transactions.some(t => t.paymentStatus === "PAID") ? "The paid amount will be recorded as a refund due for Finance to process through PayU." : "No payment was captured."}</>}
      onCancel={() => setConfirm(null)} onConfirm={reason => void act("cancel", reason)} />
    <Confirm open={confirm === "archive"} title="Archive booking?" requireReason busy={busy} error={actionError} confirmLabel="Archive"
      message="The booking leaves operational lists. Payments, status history and audit records are preserved and still count in Finance." onCancel={() => setConfirm(null)} onConfirm={reason => void act("archive", reason)} />
    <Confirm open={confirm === "restore"} title="Restore booking?" busy={busy} error={actionError} confirmLabel="Restore"
      message="The booking returns to the active lists." onCancel={() => setConfirm(null)} onConfirm={reason => void act("restore", reason)} />
  </Drawer>;
}
