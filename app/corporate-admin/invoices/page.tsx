"use client";
import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Paged } from "@/components/corporate-admin/types";
import { API, DataState, day, Empty, inr, PageHeader, Pagination, Panel, qs, Status, useAdminData } from "@/components/corporate-admin/ui";

type Invoice = { id: string; invoiceNumber: string; invoiceDate: string; dueDate: string | null; subtotal: string; taxAmount: string; totalAmount: string; paymentStatus: string; paymentMethod: string | null; booking: { id: string; bookingNumber: string; pickupDateTime: string }; downloadUrl: string };

export default function InvoicesPage() {
  const [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminData<Paged<Invoice> & { summary: { status: string; count: number; amount: string }[] }>(`${API}/invoices${qs({ status, page })}`);
  return <>
    <PageHeader title="Invoices" description="Invoices RideGrid has issued for your company's bookings. RideGrid issues one invoice per booking; this portal does not create invoices."/>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      {data.summary.length > 0 && <div className="flex flex-wrap gap-3">{data.summary.map((s) => <div key={s.status} className="rg-card flex items-center gap-3 px-4 py-3 text-sm"><Status value={s.status}/><span>{s.count}</span><span className="font-semibold">{inr(s.amount)}</span></div>)}</div>}
      <Panel title="Issued invoices" action={<select aria-label="Payment status" className="rg-input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</select>}>
        {data.items.length ? <><div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Invoice</th><th>Booking</th><th>Date</th><th>Due</th><th className="text-right">Amount</th><th>Status</th><th/></tr></thead>
          <tbody>{data.items.map((i) => <tr key={i.id}>
            <td className="font-semibold">{i.invoiceNumber}</td>
            <td><Link className="text-red-700" href={`/corporate-admin/bookings/${i.booking.id}`}>{i.booking.bookingNumber}</Link><p className="text-xs text-neutral-500">Trip {day(i.booking.pickupDateTime)}</p></td>
            <td className="whitespace-nowrap">{day(i.invoiceDate)}</td><td className="whitespace-nowrap">{day(i.dueDate)}</td>
            <td className="whitespace-nowrap text-right">{inr(i.totalAmount)}<p className="text-xs text-neutral-500">tax {inr(i.taxAmount)}</p></td>
            <td><Status value={i.paymentStatus}/></td>
            <td className="text-right"><a className="rg-secondary" href={i.downloadUrl}><Download size={14}/>PDF</a></td>
          </tr>)}</tbody>
        </table></div><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/></> : <Empty>No invoices have been issued for your company yet.</Empty>}
      </Panel>
    </>}</DataState>
  </>;
}
