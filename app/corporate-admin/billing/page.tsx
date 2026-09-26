"use client";
import Link from "next/link";
import { API, DataState, Detail, Empty, inr, Kpi, PageHeader, Panel, Status, statusText, useAdminData, when } from "@/components/corporate-admin/ui";

type Billing = {
  credit: { enabled: boolean; creditLimit: number; outstanding: number; available: number; updatedAt: string | null; status: string } | null;
  terms: { billingCycle: string | null; paymentTermsDays: number | null };
  invoiceSetting: { autoGenerateInvoice: boolean; invoiceEmail: string | null; gstEnabled: boolean; reminderDays: number } | null;
  ledger: { id: string; transactionType: string; amount: string; balanceAfter: string | null; referenceType: string | null; description: string | null; createdAt: string; bookingNumber: string | null; bookingId: string | null }[];
  payments: { byMethod: { method: string; count: number; amount: string }[]; byStatus: { status: string; count: number; amount: string }[] };
};

export default function BillingPage() {
  const { data, loading, error, reload } = useAdminData<Billing>(`${API}/billing`);
  const hasCredit = !!data?.credit && data.credit.creditLimit > 0;
  return <>
    <PageHeader title="Billing and corporate credit" description="Your RideGrid corporate credit account and how employee rides are being paid. Figures come from the central credit ledger and booking payments."/>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      {hasCredit ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Credit limit" value={inr(data.credit!.creditLimit)}/>
        <Kpi label="Utilised" value={inr(data.credit!.outstanding)}/>
        <Kpi label="Available" value={inr(data.credit!.available)} tone={data.credit!.available <= 0 ? "alert" : undefined}/>
        <Kpi label="Account" value={<Status value={data.credit!.enabled ? "ACTIVE" : data.credit!.status}/>} hint={data.credit!.updatedAt ? `Updated ${when(data.credit!.updatedAt)}` : undefined}/>
      </div> : <section className="rg-card p-5 text-sm text-neutral-600">No corporate credit limit is configured for your company, so employee rides are paid in <strong>cash at pickup</strong>. Contact RideGrid to set up corporate credit.</section>}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Credit ledger" description="Latest 50 entries. A debit is recorded when a booking is charged to corporate credit.">
          {data.ledger.length ? <div className="overflow-x-auto"><table className="rg-table">
            <thead><tr><th>Date</th><th>Entry</th><th>Booking</th><th className="text-right">Amount</th><th className="text-right">Utilised after</th></tr></thead>
            <tbody>{data.ledger.map((t) => <tr key={t.id}><td className="whitespace-nowrap">{when(t.createdAt)}</td><td><Status value={t.transactionType} tone={t.transactionType === "DEBIT" ? "amber" : "green"}/><p className="mt-1 text-xs text-neutral-500">{t.description}</p></td><td>{t.bookingId ? <Link className="text-red-700" href={`/corporate-admin/bookings/${t.bookingId}`}>{t.bookingNumber}</Link> : "—"}</td><td className="text-right">{inr(t.amount)}</td><td className="text-right">{inr(t.balanceAfter)}</td></tr>)}</tbody>
          </table></div> : <Empty>No credit ledger entries yet.</Empty>}
        </Panel>
        <div className="space-y-6">
          <Panel title="Billing terms"><Detail items={[
            ["Billing cycle", data.terms.billingCycle ? statusText(data.terms.billingCycle) : "—"], ["Payment terms", data.terms.paymentTermsDays ? `${data.terms.paymentTermsDays} days` : "—"],
            ["Invoice email", data.invoiceSetting?.invoiceEmail ?? "—"], ["GST invoices", data.invoiceSetting ? (data.invoiceSetting.gstEnabled ? "Yes" : "No") : "—"],
          ]}/><div className="border-t border-neutral-100 px-5 py-3"><Link href="/corporate-admin/invoices" className="text-sm font-semibold text-red-700">Invoices →</Link></div></Panel>
          <Panel title="Ride payments by method">{data.payments.byMethod.length ? <ul className="divide-y divide-neutral-100">{data.payments.byMethod.map((m) => <li key={m.method} className="flex justify-between px-5 py-3 text-sm"><span>{statusText(m.method)} · {m.count}</span><span className="font-medium">{inr(m.amount)}</span></li>)}</ul> : <Empty>No payments recorded yet.</Empty>}</Panel>
          <Panel title="Ride payments by state">{data.payments.byStatus.length ? <ul className="divide-y divide-neutral-100">{data.payments.byStatus.map((m) => <li key={m.status} className="flex items-center justify-between px-5 py-3 text-sm"><span className="flex items-center gap-2"><Status value={m.status}/>{m.count}</span><span className="font-medium">{inr(m.amount)}</span></li>)}</ul> : <Empty>No payments recorded yet.</Empty>}</Panel>
        </div>
      </div>
    </>}</DataState>
  </>;
}
