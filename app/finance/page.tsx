"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Confirm, Empty, Field, Kpi, Notice, Pager, Pill, Section, inr, num, send, when, words } from "@/components/admin/kit";
import { exportCsv } from "@/components/admin/RecordTable";
import { RefreshCw } from "lucide-react";

type Summary = {
  revenue: { bookings: number; bookingValue: number; gst: number; taxableValue: number; vendorEarning: number; passThrough: number; discounts: number; platformFee: number; rideGridRevenue: number; snapshotCoverage: { withSnapshot: number; total: number; complete: boolean } };
  payments: { collected: number; collectedOnline: number; collectedCorporateCredit: number; collectedCash: number; pendingAmount: number; pendingCount: number; failedAmount: number; failedCount: number; refunded: number; refundsPending: number; refundsPendingCount: number };
  unpaid: { amount: number; count: number };
  corporate: { outstanding: number; limit: number; accounts: number };
  vendors: { earned: number; paid: number; inProcess: number; outstanding: number };
};
type Tx = { id: string; type: string; method: string; status: string; amount: number; channel: string; reference: string | null; remarks: string | null; createdAt: string; vendor: { companyName: string } | null; booking: { bookingNumber: string; status: string; gst: number | null; archived: boolean; company: string | null; customer: string } | null };
type TxList = { rows: Tx[]; total: number; sum: number; page: number; totalPages: number };

const TABS = ["overview", "transactions", "refunds", "vendors", "corporates"] as const;

export default function FinancePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [range, setRange] = useState({ from: "", to: "" });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    const t = u.get("tab"); if (t && (TABS as readonly string[]).includes(t)) setTab(t as (typeof TABS)[number]);
    if (u.get("paymentStatus")) setTab("transactions");
  }, []);
  const rangeQs = new URLSearchParams({ ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) }).toString();

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Finance" description="Booking value, collections, GST, refunds, vendor payables and corporate receivables — computed from bookings, transactions, Corporate Credit and settlements. Nothing here is estimated.">
      <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); setRange({ from, to }); }}>
        <Field label="From"><input type="date" className="rg-input" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className="rg-input" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <button className="rg-primary" type="submit">Apply</button>{(range.from || range.to) && <button type="button" className="rg-secondary" onClick={() => { setFrom(""); setTo(""); setRange({ from: "", to: "" }); }}>All time</button>}
      </form>
    </PageHeading>
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}
    <div className="flex flex-wrap gap-2" role="tablist">{TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "rg-primary" : "rg-secondary"} onClick={() => setTab(t)}>{t === "vendors" ? "Vendor payables" : t === "corporates" ? "Corporate receivables" : words(t)}</button>)}</div>
    {tab === "overview" && <Overview qs={rangeQs} label={range.from || range.to ? `${range.from || "start"} → ${range.to || "today"}` : "All time"} />}
    {tab === "transactions" && <Transactions qs={rangeQs} />}
    {tab === "refunds" && <Transactions qs={rangeQs} refunds onNotice={setNotice} />}
    {tab === "vendors" && <VendorPayables />}
    {tab === "corporates" && <CorporateReceivables />}
  </div></DashboardLayout>;
}

function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await send<T>(url, "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load."); } finally { setLoading(false); } }, [url]);
  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, load };
}

function Overview({ qs, label }: { qs: string; label: string }) {
  const { data: s, loading, error, load } = useLoad<Summary>(`/api/admin/finance?view=summary&${qs}`);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!s) return <p className="rg-card p-10 text-center text-sm text-neutral-500">{loading ? "Loading…" : "No data"}</p>;
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><p className="text-sm text-neutral-500">Period: {label}. Booking figures use booking date; payment figures use transaction date.</p><button className="rg-secondary" onClick={() => void load()}><RefreshCw size={14} />Refresh</button></div>
    <Section title="Bookings (confirmed or later)"><div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-7">
      <Kpi label="Bookings" value={num(s.revenue.bookings)} /><Kpi label="Booking value (incl. GST)" value={inr(s.revenue.bookingValue)} /><Kpi label="GST" value={inr(s.revenue.gst)} /><Kpi label="Taxable value" value={inr(s.revenue.taxableValue)} />
      <Kpi label="Vendor share" value={inr(s.revenue.vendorEarning)} /><Kpi label="Platform fee" value={inr(s.revenue.platformFee)} hint={s.revenue.snapshotCoverage.complete ? undefined : `${s.revenue.snapshotCoverage.withSnapshot}/${s.revenue.snapshotCoverage.total} bookings have a pricing snapshot; historical pricing details unavailable for the rest (excluded, not estimated)`} />
      <Kpi label="RideGrid net revenue" value={inr(s.revenue.rideGridRevenue)} hint="Platform fee − RideGrid-funded discounts − processing" />
    </div></Section>
    <Section title="Payments"><div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-6">
      <Kpi label="Collected" value={inr(s.payments.collected)} tone="good" /><Kpi label="via PayU" value={inr(s.payments.collectedOnline)} /><Kpi label="via Corporate Credit" value={inr(s.payments.collectedCorporateCredit)} />
      <Kpi label="Cash (legacy bookings)" value={inr(s.payments.collectedCash)} /><Kpi label="Open unpaid" value={inr(s.unpaid.amount)} hint={`${num(s.unpaid.count)} payment(s), excludes cancelled`} tone={s.unpaid.count ? "warn" : undefined} />
      <Kpi label="Failed payments" value={num(s.payments.failedCount)} hint={inr(s.payments.failedAmount)} tone={s.payments.failedCount ? "bad" : undefined} />
      <Kpi label="Refunded" value={inr(s.payments.refunded)} /><Kpi label="Refunds due" value={inr(s.payments.refundsPending)} hint={`${num(s.payments.refundsPendingCount)} to process`} tone={s.payments.refundsPendingCount ? "warn" : undefined} />
    </div></Section>
    <div className="grid gap-5 md:grid-cols-2">
      <Section title="Vendor payables (all time)"><div className="grid grid-cols-2 gap-3 p-4"><Kpi label="Earned (completed trips)" value={inr(s.vendors.earned)} /><Kpi label="Paid out" value={inr(s.vendors.paid)} /><Kpi label="In process" value={inr(s.vendors.inProcess)} /><Kpi label="Outstanding" value={inr(s.vendors.outstanding)} tone={s.vendors.outstanding ? "warn" : undefined} /></div></Section>
      <Section title="Corporate receivables (current)"><div className="grid grid-cols-2 gap-3 p-4"><Kpi label="Outstanding credit used" value={inr(s.corporate.outstanding)} /><Kpi label="Total credit limits" value={inr(s.corporate.limit)} hint={`${num(s.corporate.accounts)} credit account(s)`} /></div></Section>
    </div>
  </div>;
}

function Transactions({ qs, refunds, onNotice }: { qs: string; refunds?: boolean; onNotice?: (m: string) => void }) {
  const [f, setF] = useState({ q: "", type: refunds ? "REFUND" : "", status: "", channel: "" });
  const [applied, setApplied] = useState(f); const [page, setPage] = useState(1);
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("paymentStatus"); if (s && !refunds) { setF(x => ({ ...x, status: s })); setApplied(x => ({ ...x, status: s })); } }, [refunds]);
  const url = useMemo(() => `/api/admin/finance?view=transactions&${qs}&${new URLSearchParams(Object.fromEntries(Object.entries({ ...applied, type: refunds ? "REFUND" : applied.type, page: String(page) }).filter(([, v]) => v)) as Record<string, string>).toString()}`, [qs, applied, page, refunds]);
  const { data, loading, error, load } = useLoad<TxList>(url);
  const [complete, setComplete] = useState<Tx | null>(null); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  const finish = async (reference: string) => {
    if (!complete) return;
    setBusy(true); setActionError("");
    try { await send("/api/admin/finance", "POST", { action: "complete-refund", transactionId: complete.id, reference }); setComplete(null); onNotice?.("Refund marked as completed."); await load(); } catch (e) { setActionError(e instanceof Error ? e.message : "Unable to update refund."); } finally { setBusy(false); }
  };
  return <div className="space-y-4">
    <section className="rg-card p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={e => { e.preventDefault(); setPage(1); setApplied(f); }}>
      <Field label="Booking no. / reference / txn id"><input className="rg-input" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} /></Field>
      {!refunds && <Field label="Type"><select className="rg-input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="">All</option>{["BOOKING_PAYMENT", "REFUND", "VENDOR_PAYOUT", "DRIVER_PAYOUT", "PLATFORM_COMMISSION"].map(t => <option key={t} value={t}>{words(t)}</option>)}</select></Field>}
      <Field label="Status"><select className="rg-input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="">All</option>{["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIAL"].map(t => <option key={t} value={t}>{words(t)}</option>)}</select></Field>
      <Field label="Channel"><select className="rg-input" value={f.channel} onChange={e => setF({ ...f, channel: e.target.value })}><option value="">All</option><option value="PAYU">PayU</option><option value="CORPORATE_CREDIT">Corporate Credit</option><option value="CASH">Cash (legacy)</option></select></Field>
      <div className="flex items-end gap-2"><button className="rg-primary" type="submit">Apply</button>{data && data.rows.length > 0 && <button type="button" className="rg-secondary" onClick={() => exportCsv(data.rows.map(r => ({ ...r, bookingNumber: r.booking?.bookingNumber ?? "", company: r.booking?.company ?? "", vendorName: r.vendor?.companyName ?? "" })), [{ key: "createdAt", title: "Created" }, { key: "type", title: "Type" }, { key: "channel", title: "Channel" }, { key: "method", title: "Method" }, { key: "status", title: "Status" }, { key: "amount", title: "Amount" }, { key: "reference", title: "Reference" }, { key: "bookingNumber", title: "Booking" }, { key: "company", title: "Company" }, { key: "vendorName", title: "Vendor" }], refunds ? "ridegrid-refunds" : "ridegrid-transactions")}>Export CSV (page)</button>}</div>
    </form></section>
    {error ? <Notice tone="error">{error}</Notice> : <section className="rg-card">
      {loading && !data ? <p className="p-10 text-center text-sm text-neutral-500">Loading…</p> : !data?.rows.length ? <Empty title={refunds ? "No refunds" : "No transactions"} text="Adjust the filters or date range." /> : <>
        <div className="overflow-x-auto"><table className="rg-table min-w-[1200px]"><thead><tr><th>Created</th><th>Type</th><th>Channel</th><th>Status</th><th>Booking</th><th>Customer / company</th><th>Vendor</th><th>Reference</th><th className="text-right">Amount</th>{refunds && <th />}</tr></thead>
          <tbody>{data.rows.map(t => <tr key={t.id}><td className="whitespace-nowrap text-xs">{when(t.createdAt)}</td><td>{words(t.type)}</td><td>{t.channel}{t.channel === "PayU" && <p className="text-[11px] text-neutral-500">{words(t.method)}</p>}</td><td><Pill value={t.status} label={t.type === "REFUND" && t.status === "PENDING" ? "Refund due" : undefined} /></td>
            <td>{t.booking ? <Link className="font-semibold text-red-700" href={`/bookings?q=${t.booking.bookingNumber}${t.booking.archived ? "&archived=1" : ""}`}>{t.booking.bookingNumber}</Link> : "—"}</td>
            <td className="text-xs">{t.booking ? `${t.booking.company ? `${t.booking.company} · ` : ""}${t.booking.customer}` : "—"}</td><td className="text-xs">{t.vendor?.companyName ?? "—"}</td>
            <td className="max-w-[220px] truncate text-xs" title={t.remarks ?? ""}>{t.reference ?? "—"}</td><td className="text-right font-semibold">{inr(t.amount, 2)}</td>
            {refunds && <td>{t.status === "PENDING" && <button className="rg-secondary" onClick={() => { setActionError(""); setComplete(t); }}>Mark refunded</button>}</td>}</tr>)}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-2 text-sm"><span className="text-neutral-500">Total of all matching: <strong>{inr(data.sum, 2)}</strong></span></div>
        <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      </>}
    </section>}
    <Confirm open={!!complete} title="Mark refund as completed?" requireReason reasonLabel="PayU refund reference (required)" busy={busy} error={actionError} confirmLabel="Mark refunded" message={<>Enter the PayU refund reference for {inr(complete?.amount, 2)} on {complete?.booking?.bookingNumber}. Only do this after the gateway confirms the refund.</>} onCancel={() => setComplete(null)} onConfirm={ref => void finish(ref)} />
  </div>;
}

function VendorPayables() {
  const { data, error } = useLoad<{ id: string; companyName: string; state: string; completedTrips: number; earned: number; paid: number; inProcess: number; outstanding: number }[]>("/api/admin/finance?view=vendors");
  if (error) return <Notice tone="error">{error}</Notice>;
  return <Section title="Vendor payables" description="Earned = vendor amount on completed trips. Paid = completed settlements.">{!data ? <p className="p-8 text-center text-sm text-neutral-500">Loading…</p> : !data.length ? <Empty title="No vendor earnings yet" text="Payables appear once trips are completed." /> :
    <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Vendor</th><th className="text-right">Completed trips</th><th className="text-right">Earned</th><th className="text-right">Paid</th><th className="text-right">In process</th><th className="text-right">Outstanding</th></tr></thead><tbody>{data.map(v => <tr key={v.id}><td><Link className="font-semibold text-red-700" href={`/vendors`}>{v.companyName}</Link> {v.state !== "ACTIVE" && <Pill value={v.state} />}</td><td className="text-right">{num(v.completedTrips)}</td><td className="text-right">{inr(v.earned)}</td><td className="text-right">{inr(v.paid)}</td><td className="text-right">{inr(v.inProcess)}</td><td className="text-right font-semibold">{inr(v.outstanding)}</td></tr>)}</tbody></table></div>}</Section>;
}

function CorporateReceivables() {
  const { data, error } = useLoad<{ corporateId: string; companyName: string; status: string; billingCycle: string; paymentTermsDays: number | null; creditLimit: number; outstanding: number; available: number }[]>("/api/admin/finance?view=corporates");
  if (error) return <Notice tone="error">{error}</Notice>;
  return <Section title="Corporate receivables" description="Outstanding = Corporate Credit used and not yet settled by the company.">{!data ? <p className="p-8 text-center text-sm text-neutral-500">Loading…</p> : !data.length ? <Empty title="No Corporate Credit accounts" /> :
    <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Company</th><th>Status</th><th>Billing</th><th className="text-right">Limit</th><th className="text-right">Outstanding</th><th className="text-right">Available</th></tr></thead><tbody>{data.map(c => <tr key={c.corporateId}><td><Link className="font-semibold text-red-700" href={`/corporate?open=${c.corporateId}`}>{c.companyName}</Link></td><td><Pill value={c.status} /></td><td className="text-xs">{words(c.billingCycle)} · {c.paymentTermsDays ?? 30} days</td><td className="text-right">{inr(c.creditLimit)}</td><td className="text-right font-semibold">{inr(c.outstanding)}</td><td className="text-right">{inr(c.available)}</td></tr>)}</tbody></table></div>}</Section>;
}
