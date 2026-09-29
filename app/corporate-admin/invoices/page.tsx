"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, FileArchive, RotateCcw } from "lucide-react";
import { OrgOptions, Paged } from "@/components/corporate-admin/types";
import { API, DataState, day, downloadCsv, Empty, inr, Notice, PageHeader, Pagination, Panel, qs, Status, useAdminData, useDebounced } from "@/components/corporate-admin/ui";

type Invoice = {
  id: string; invoiceNumber: string; invoiceDate: string; dueDate: string | null; subtotal: string; taxAmount: string; discountAmount: string; totalAmount: string; paymentStatus: string; overdue: boolean;
  booking: { id: string; bookingNumber: string; pickupDateTime: string; pickupLocation: string; dropLocation: string };
  employee: { id: string | null; name: string; code: string }; branch: string | null; department: string | null; downloadUrl: string;
};
type View = Paged<Invoice> & { summary: { status: string; count: number; amount: string; tax: string }[]; unbilled: { trips: number; amount: string } };
const LIMIT = 50;

function Invoices() {
  const params = useSearchParams();
  const blank = { status: params.get("status") ?? "", branchId: "", departmentId: "", employeeId: "", from: "", to: "", q: "" };
  const [f, setF] = useState(blank);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const q = useDebounced(f.q);
  const filters = { ...f, q };
  const { data: o } = useAdminData<OrgOptions>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<View>(`${API}/invoices${qs({ ...filters, page })}`);
  useEffect(() => { setPicked(new Set()); }, [f.status, f.branchId, f.departmentId, f.employeeId, f.from, f.to, q]);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value, ...(k === "branchId" ? { departmentId: "", employeeId: "" } : k === "departmentId" ? { employeeId: "" } : {}) }); setPage(1); };
  const departments = (o?.departments ?? []).filter((d) => !f.branchId || d.branchId === f.branchId);
  const people = (o?.people ?? []).filter((p) => (!f.branchId || p.branchId === f.branchId) && (!f.departmentId || p.departmentId === f.departmentId));
  const all = !!data && data.items.length > 0 && data.items.every((i) => picked.has(i.id));
  const toggle = (id: string) => { const n = new Set(picked); if (n.has(id)) n.delete(id); else n.add(id); setPicked(n); };
  function exportCsv() {
    if (!data) return;
    const rows = data.items.filter((i) => !picked.size || picked.has(i.id));
    downloadCsv(`ridegrid-invoices-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Invoice", "Invoice date", "Due date", "Booking", "Trip date", "Employee", "Employee ID", "Branch", "Department", "Taxable value", "GST", "Discount", "Total", "Status"],
      ...rows.map((i) => [i.invoiceNumber, day(i.invoiceDate), day(i.dueDate), i.booking.bookingNumber, day(i.booking.pickupDateTime), i.employee.name, i.employee.code, i.branch ?? "", i.department ?? "", i.subtotal, i.taxAmount, i.discountAmount, i.totalAmount, i.overdue ? "OVERDUE" : i.paymentStatus]),
    ]);
  }
  const zipSelected = `${API}/documents/invoices?ids=${[...picked].join(",")}`;
  const zipFiltered = `${API}/documents/invoices${qs({ ...filters, all: 1 })}`;
  return <>
    <PageHeader title="Invoices" description="Invoices RideGrid Finance issues for your company's completed trips — one invoice per booking, with the statutory numbering and GST from the central invoice record.">
      <button className="rg-secondary" disabled={!data?.items.length} onClick={exportCsv}><Download size={15}/>Export CSV{picked.size ? ` (${picked.size})` : ""}</button>
    </PageHeader>
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && <>
      <div className="flex flex-wrap gap-3">
        {data.summary.map((s) => <div key={s.status} className="rg-card flex items-center gap-3 px-4 py-3 text-sm"><Status value={s.status}/><span>{s.count}</span><span className="font-semibold">{inr(s.amount)}</span><span className="text-xs text-neutral-500">GST {inr(s.tax)}</span></div>)}
        <div className="rg-card flex items-center gap-3 px-4 py-3 text-sm"><Status value="Unbilled" tone="gray"/><span>{data.unbilled.trips} completed trip(s)</span><span className="font-semibold">{inr(data.unbilled.amount)}</span></div>
      </div>
      <Panel title="Filters" action={<button className="rg-secondary" onClick={() => { setF({ ...blank, status: "" }); setPage(1); }}><RotateCcw size={14}/>Reset</button>}>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <input aria-label="Invoice number" placeholder="Invoice number…" className="rg-input" value={f.q} onChange={set("q")}/>
          <select aria-label="Branch" className="rg-input" value={f.branchId} onChange={set("branchId")}><option value="">All branches</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select>
          <select aria-label="Department" className="rg-input" value={f.departmentId} onChange={set("departmentId")}><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select>
          <select aria-label="Employee" className="rg-input" value={f.employeeId} onChange={set("employeeId")}><option value="">All employees</option>{people.map((p) => <option key={p.id} value={p.id}>{p.employeeName}</option>)}</select>
          <label className="text-xs text-neutral-500">Invoice from<input type="date" className="rg-input mt-1" value={f.from} onChange={set("from")}/></label>
          <label className="text-xs text-neutral-500">Invoice to<input type="date" className="rg-input mt-1" value={f.to} onChange={set("to")}/></label>
          <select aria-label="Payment status" className="rg-input" value={f.status} onChange={set("status")}><option value="">All statuses</option><option value="PENDING">Unpaid</option><option value="PARTIAL">Part-paid</option><option value="OVERDUE">Overdue</option><option value="PAID">Paid</option><option value="REFUNDED">Refunded</option></select>
        </div>
      </Panel>
      <Panel title="Issued invoices" description={`${data.total.toLocaleString("en-IN")} matching`} action={<div className="flex flex-wrap gap-2">
        <a className={`rg-secondary ${picked.size ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!picked.size} href={picked.size ? zipSelected : undefined}><FileArchive size={15}/>Download selected ({picked.size})</a>
        <a className={`rg-secondary ${data.total && data.total <= LIMIT ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!data.total || data.total > LIMIT} href={data.total && data.total <= LIMIT ? zipFiltered : undefined}><FileArchive size={15}/>Download all filtered ({data.total})</a>
      </div>}>
        {data.total > LIMIT && <div className="px-5 pt-4"><Notice>Bulk download is limited to {LIMIT} invoices at a time. Narrow the filters or select invoices individually.</Notice></div>}
        {data.items.length ? <><div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th><input type="checkbox" aria-label="Select all on this page" checked={all} onChange={() => setPicked(all ? new Set() : new Set([...picked, ...data.items.map((i) => i.id)]))}/></th><th>Invoice</th><th>Booking / trip</th><th>Employee</th><th>Due</th><th className="text-right">Taxable</th><th className="text-right">GST</th><th className="text-right">Total</th><th>Status</th><th/></tr></thead>
          <tbody>{data.items.map((i) => <tr key={i.id}>
            <td><input type="checkbox" aria-label={`Select ${i.invoiceNumber}`} checked={picked.has(i.id)} onChange={() => toggle(i.id)}/></td>
            <td className="font-semibold">{i.invoiceNumber}<p className="text-xs font-normal text-neutral-500">{day(i.invoiceDate)}</p></td>
            <td><Link className="text-red-700" href={`/corporate-admin/bookings/${i.booking.id}`}>{i.booking.bookingNumber}</Link><p className="text-xs text-neutral-500">Trip {day(i.booking.pickupDateTime)}</p></td>
            <td>{i.employee.id ? <Link className="text-red-700" href={`/corporate-admin/employees/${i.employee.id}`}>{i.employee.name}</Link> : i.employee.name}<p className="text-xs text-neutral-500">{[i.branch, i.department].filter(Boolean).join(" · ")}</p></td>
            <td className="whitespace-nowrap">{day(i.dueDate)}</td>
            <td className="whitespace-nowrap text-right">{inr(i.subtotal)}</td><td className="whitespace-nowrap text-right">{inr(i.taxAmount)}</td><td className="whitespace-nowrap text-right font-medium">{inr(i.totalAmount)}</td>
            <td><Status value={i.overdue ? "OVERDUE" : i.paymentStatus}/></td>
            <td className="text-right"><a className="rg-secondary" href={i.downloadUrl}><Download size={14}/>PDF</a></td>
          </tr>)}</tbody>
        </table></div><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/></> : <Empty>{data.unbilled.trips ? `No invoices match. ${data.unbilled.trips} completed trip(s) are awaiting an invoice from RideGrid Finance.` : "No invoices have been issued for your company yet. Invoices appear after trips are completed and billed."}</Empty>}
      </Panel>
    </>}</DataState>
  </>;
}

export default function InvoicesPage() { return <Suspense><Invoices/></Suspense>; }
