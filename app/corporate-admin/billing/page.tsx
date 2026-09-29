"use client";
import { useState } from "react";
import Link from "next/link";
import { API, DataState, day, Detail, Empty, inr, Kpi, PageHeader, Panel, qs, Status, statusText, Tabs, useAdminData, when } from "@/components/corporate-admin/ui";

type Finance = {
  spend: string; bookings: number; completedSpend: string; completedTrips: number; billed: string; invoices: number; invoiceTax: string; paid: string; paidInvoices: number;
  outstanding: string; outstandingInvoices: number; partialInvoices: number; due: string; dueInvoices: number; overdue: string; overdueInvoices: number; unbilled: string; unbilledTrips: number; nextDueDate: string | null;
};
type Row = { key: string; name?: string; code?: string; bookings: number; completed: number; cancelled: number; spend: string; gst: string; billed: string; paid: string; outstanding: string; unbilled: string };
type Billing = {
  range: { from: string; to: string };
  credit: { enabled: boolean; creditLimit: number; outstanding: number; available: number; updatedAt: string | null; status: string } | null;
  terms: { billingCycle: string | null; paymentTermsDays: number | null };
  invoiceSetting: { autoGenerateInvoice: boolean; invoiceEmail: string | null; gstEnabled: boolean; reminderDays: number } | null;
  budget: { allocated: string; used: string; committed: string; available: string; budgets: { id: string; name: string; endDate: string }[] } | null;
  lifetime: Finance; inRange: Finance;
  openInvoices: { id: string; invoiceNumber: string; totalAmount: string; dueDate: string | null; paymentStatus: string; overdue: boolean; downloadUrl: string; booking: { id: string; bookingNumber: string } }[];
  breakdown: { truncated: boolean; byMonth: Row[]; byBranch: Row[]; byDepartment: Row[]; byEmployee: Row[] };
  ledger: { id: string; transactionType: string; amount: string; balanceAfter: string | null; referenceType: string | null; description: string | null; createdAt: string; bookingNumber: string | null; bookingId: string | null }[];
};
type By = "byMonth" | "byBranch" | "byDepartment" | "byEmployee";
const monthName = (k: string) => new Date(`${k}-01T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export default function BillingPage() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [by, setBy] = useState<By>("byMonth");
  const { data, loading, error, reload } = useAdminData<Billing>(`${API}/billing${qs(range)}`);
  const hasCredit = !!data?.credit && data.credit.creditLimit > 0;
  const f = data?.lifetime;
  return <>
    <PageHeader title="Billing and corporate credit" description="Authoritative figures from central bookings, invoices issued by RideGrid Finance and your corporate credit ledger. Nothing here is estimated."/>
    <DataState loading={loading} error={error} onRetry={reload}>{data && f && <>
      <section aria-label="Budget and spend" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total budget (current)" value={data.budget ? inr(data.budget.allocated) : "—"} hint={data.budget ? data.budget.budgets.map((b) => b.name).join(", ") : "No active company budget"} href="/corporate-admin/budgets"/>
        <Kpi label="Used budget" value={data.budget ? inr(Number(data.budget.used) + Number(data.budget.committed)) : "—"} hint={data.budget ? `${inr(data.budget.used)} completed · ${inr(data.budget.committed)} committed` : undefined}/>
        <Kpi label="Available budget" value={data.budget ? inr(data.budget.available) : "—"}/>
        <Kpi label="Total spend (all time)" value={inr(f.spend)} hint={`${f.bookings} non-cancelled booking(s)`}/>
      </section>
      <section aria-label="Invoices" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Billed" value={inr(f.billed)} hint={`${f.invoices} invoice(s) · GST ${inr(f.invoiceTax)}`} href="/corporate-admin/invoices"/>
        <Kpi label="Unbilled" value={inr(f.unbilled)} hint={`${f.unbilledTrips} completed trip(s) awaiting invoice`}/>
        <Kpi label="Paid" value={inr(f.paid)} hint={`${f.paidInvoices} invoice(s)`} href="/corporate-admin/invoices?status=PAID"/>
        <Kpi label="Outstanding" value={inr(f.outstanding)} hint={`${f.outstandingInvoices} invoice(s)${f.partialInvoices ? ` · ${f.partialInvoices} part-paid shown in full` : ""}`} href="/corporate-admin/invoices?status=PENDING"/>
        <Kpi label="Due" value={inr(f.due)} hint={f.nextDueDate ? `Next due ${day(f.nextDueDate)}` : `${f.dueInvoices} invoice(s)`}/>
        <Kpi label="Overdue" value={inr(f.overdue)} tone={f.overdueInvoices ? "alert" : undefined} hint={`${f.overdueInvoices} invoice(s) past due date`} href="/corporate-admin/invoices?status=OVERDUE"/>
      </section>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Breakdown" description="Trips by pickup date in the selected range. Billed/paid/outstanding follow each trip's invoice." action={<div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-neutral-500">From<input type="date" className="rg-input mt-1" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })}/></label>
          <label className="text-xs text-neutral-500">To<input type="date" className="rg-input mt-1" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}/></label>
        </div>}>
          <Tabs label="Breakdown" value={by} onChange={setBy} items={[{ value: "byMonth", label: "Month" }, { value: "byBranch", label: "Branch" }, { value: "byDepartment", label: "Department" }, { value: "byEmployee", label: "Employee" }]}/>
          {data.breakdown[by].length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>{by === "byMonth" ? "Month" : by === "byBranch" ? "Branch" : by === "byDepartment" ? "Department" : "Employee"}</th><th className="text-right">Trips</th><th className="text-right">Spend</th><th className="text-right">GST</th><th className="text-right">Billed</th><th className="text-right">Unbilled</th><th className="text-right">Paid</th><th className="text-right">Outstanding</th></tr></thead>
            <tbody>{data.breakdown[by].map((r) => <tr key={r.key}><td>{r.name ?? monthName(r.key)}{r.code ? <span className="ml-1 text-xs text-neutral-500">{r.code}</span> : null}</td><td className="text-right">{r.bookings - r.cancelled}</td><td className="text-right">{inr(r.spend)}</td><td className="text-right">{inr(r.gst)}</td><td className="text-right">{inr(r.billed)}</td><td className="text-right">{inr(r.unbilled)}</td><td className="text-right">{inr(r.paid)}</td><td className="text-right">{inr(r.outstanding)}</td></tr>)}</tbody></table></div> : <Empty>No trips in this range.</Empty>}
          <p className="border-t border-neutral-100 px-5 py-2 text-xs text-neutral-500">Range {day(data.range.from)} – {day(new Date(new Date(data.range.to).getTime() - 1).toISOString())}. In range: spend {inr(data.inRange.spend)}, billed {inr(data.inRange.billed)}, outstanding {inr(data.inRange.outstanding)}.{data.breakdown.truncated ? " Over 20,000 trips — narrow the range for complete totals." : ""}</p>
        </Panel>
        <div className="space-y-6">
          <Panel title="Corporate credit" action={hasCredit ? <Status value={data.credit!.enabled ? "ACTIVE" : data.credit!.status}/> : undefined}>
            {hasCredit ? <Detail items={[["Credit limit", inr(data.credit!.creditLimit)], ["Utilised", inr(data.credit!.outstanding)], ["Available", inr(data.credit!.available)], ["Updated", when(data.credit!.updatedAt)]]}/>
              : <p className="p-5 text-sm text-neutral-600">No corporate credit limit is configured. Corporate rides are paid only by corporate credit, so employees cannot confirm bookings until RideGrid sets a limit.</p>}
          </Panel>
          <Panel title="Billing terms"><Detail items={[
            ["Billing cycle", data.terms.billingCycle ? statusText(data.terms.billingCycle) : "—"], ["Payment terms", data.terms.paymentTermsDays ? `${data.terms.paymentTermsDays} days` : "—"],
            ["Invoice email", data.invoiceSetting?.invoiceEmail ?? "—"], ["GST invoices", data.invoiceSetting ? (data.invoiceSetting.gstEnabled ? "Yes" : "No") : "—"],
          ]}/></Panel>
          <Panel title="Unpaid invoices" action={<Link href="/corporate-admin/invoices" className="text-sm font-semibold text-red-700">Invoices</Link>}>
            {data.openInvoices.length ? <ul className="divide-y divide-neutral-100">{data.openInvoices.map((i) => <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span><a className="font-medium text-red-700" href={i.downloadUrl}>{i.invoiceNumber}</a><span className="block text-xs text-neutral-500">{i.booking.bookingNumber} · due {day(i.dueDate)}</span></span><span className="text-right">{inr(i.totalAmount)}{i.overdue && <span className="block"><Status value="OVERDUE"/></span>}</span></li>)}</ul> : <Empty>No unpaid invoices.</Empty>}
          </Panel>
        </div>
      </div>
      <Panel title="Credit ledger" description="Latest 50 entries. A debit is recorded when a booking is charged to corporate credit; a credit when a cancellation restores it.">
        {data.ledger.length ? <div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Date</th><th>Entry</th><th>Booking</th><th className="text-right">Amount</th><th className="text-right">Utilised after</th></tr></thead>
          <tbody>{data.ledger.map((t) => <tr key={t.id}><td className="whitespace-nowrap">{when(t.createdAt)}</td><td><Status value={t.transactionType} tone={t.transactionType === "DEBIT" ? "amber" : "green"}/><p className="mt-1 text-xs text-neutral-500">{t.description}</p></td><td>{t.bookingId ? <Link className="text-red-700" href={`/corporate-admin/bookings/${t.bookingId}`}>{t.bookingNumber}</Link> : "—"}</td><td className="text-right">{inr(t.amount)}</td><td className="text-right">{inr(t.balanceAfter)}</td></tr>)}</tbody>
        </table></div> : <Empty>No credit ledger entries yet.</Empty>}
      </Panel>
    </>}</DataState>
  </>;
}
