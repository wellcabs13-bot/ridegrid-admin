"use client";
import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { OrgOptions } from "@/components/corporate-admin/types";
import { API, DataState, downloadCsv, Empty, inr, Kpi, Notice, PageHeader, Panel, qs, statusText, useAdminData } from "@/components/corporate-admin/ui";

type Row = { key: string; bookings: number; completed: number; cancelled: number; spend: string; gst: string; billed: string; paid: string; outstanding: string; unbilled: string; name?: string; code?: string };
type Report = {
  range: { from: string; to: string }; truncated: boolean;
  totals: { bookings: number; spend: string; creditSpend: string; completed: number; cancelled: number };
  finance: { billed: string; invoices: number; invoiceTax: string; invoiceTaxable: string; paid: string; outstanding: string; overdue: string; unbilled: string; bookedTax: string };
  byMonth: Row[]; byBranch: Row[]; byDepartment: Row[]; byEmployee: Row[]; byService: Row[];
  byStatus: { key: string; count: number }[]; approvals: { key: string; count: number; amount: string }[];
};

const monthName = (k: string) => new Date(`${k}-01T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

// Single-series horizontal bars: one hue, value in text ink, exact value on hover and in the table below.
function Bars({ rows, value, format, label }: { rows: { label: string; v: number }[]; value: string; format: (v: number) => string; label: string }) {
  const max = Math.max(0, ...rows.map((r) => r.v));
  if (!rows.length) return <Empty>No data for this range.</Empty>;
  return <ul className="space-y-2.5 p-5" aria-label={label}>{rows.map((r) => <li key={r.label} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm" title={`${r.label}: ${format(r.v)} ${value}`}>
    <span className="truncate text-neutral-600">{r.label}</span>
    <span className="h-4 rounded-r bg-neutral-100"><span className="block h-4 rounded-r bg-red-600/80" style={{ width: `${max ? Math.max(1, (r.v / max) * 100) : 0}%` }}/></span>
    <span className="whitespace-nowrap text-right font-medium tabular-nums">{format(r.v)}</span>
  </li>)}</ul>;
}

function Table({ rows, first }: { rows: Row[]; first: string }) {
  return <div className="overflow-x-auto border-t border-neutral-100"><table className="rg-table"><thead><tr><th>{first}</th><th className="text-right">Bookings</th><th className="text-right">Completed</th><th className="text-right">Cancelled</th><th className="text-right">Spend</th><th className="text-right">GST</th><th className="text-right">Outstanding</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key}><td>{r.name ?? (first === "Month" ? monthName(r.key) : statusText(r.key))}{r.code ? <span className="ml-1 text-xs text-neutral-500">{r.code}</span> : null}</td><td className="text-right">{r.bookings}</td><td className="text-right">{r.completed}</td><td className="text-right">{r.cancelled}</td><td className="text-right">{inr(r.spend)}</td><td className="text-right">{inr(r.gst)}</td><td className="text-right">{inr(r.outstanding)}</td></tr>)}</tbody></table></div>;
}

export default function ReportsPage() {
  const blank = { from: "", to: "", branchId: "", departmentId: "", employeeId: "", service: "", status: "" };
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, ...(k === "branchId" ? { departmentId: "", employeeId: "" } : k === "departmentId" ? { employeeId: "" } : {}) });
  const { data: o } = useAdminData<OrgOptions>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<Report>(`${API}/reports${qs(f)}`);
  const people = (o?.people ?? []).filter((p) => (!f.branchId || p.branchId === f.branchId) && (!f.departmentId || p.departmentId === f.departmentId));
  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [["Section", "Item", "Bookings", "Completed", "Cancelled", "Spend (INR)", "GST (INR)", "Billed (INR)", "Paid (INR)", "Outstanding (INR)", "Unbilled (INR)"]];
    const add = (section: string, list: Row[], name: (r: Row) => string) => list.forEach((r) => rows.push([section, name(r), r.bookings, r.completed, r.cancelled, r.spend, r.gst, r.billed, r.paid, r.outstanding, r.unbilled]));
    add("Month", data.byMonth, (r) => r.key); add("Branch", data.byBranch, (r) => r.name ?? r.key); add("Department", data.byDepartment, (r) => r.name ?? r.key);
    add("Employee", data.byEmployee, (r) => `${r.name ?? ""} ${r.code ?? ""}`.trim()); add("Service", data.byService, (r) => r.key);
    data.approvals.forEach((a) => rows.push(["Approval requests", a.key, a.count, "", "", a.amount, "", "", "", "", ""]));
    downloadCsv(`ridegrid-travel-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }
  const approvals = (k: string) => data?.approvals.find((a) => a.key === k)?.count ?? 0;
  return <>
    <PageHeader title="Reports" description="Travel, spend, approvals and billing for your company from central RideGrid bookings and invoices. Spend excludes cancelled bookings and is grouped by pickup date (India time).">
      <button className="rg-secondary" disabled={!data} onClick={exportCsv}><Download size={15}/>Export CSV</button>
    </PageHeader>
    <Panel title="Filters" action={<button className="rg-secondary" onClick={() => setF(blank)}><RotateCcw size={14}/>Reset</button>}>
      <div className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-7">
        <label className="text-xs text-neutral-500">From<input type="date" className="rg-input mt-1" value={f.from} onChange={set("from")}/></label>
        <label className="text-xs text-neutral-500">To<input type="date" className="rg-input mt-1" value={f.to} onChange={set("to")}/></label>
        <label className="text-xs text-neutral-500">Branch<select className="rg-input mt-1" value={f.branchId} onChange={set("branchId")}><option value="">All</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Department<select className="rg-input mt-1" value={f.departmentId} onChange={set("departmentId")}><option value="">All</option>{o?.departments.filter((d) => !f.branchId || d.branchId === f.branchId).map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Employee<select className="rg-input mt-1" value={f.employeeId} onChange={set("employeeId")}><option value="">All</option>{people.map((p) => <option key={p.id} value={p.id}>{p.employeeName}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Service<select className="rg-input mt-1" value={f.service} onChange={set("service")}><option value="">All</option><option value="ONE_WAY">One way</option><option value="ROUNDTRIP">Round trip</option><option value="LOCAL">Local</option><option value="AIRPORT">Airport</option></select></label>
        <label className="text-xs text-neutral-500">Booking status<select className="rg-input mt-1" value={f.status} onChange={set("status")}><option value="">All</option>{["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED", "TRIP_COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{statusText(s)}</option>)}</select></label>
      </div>
      <p className="border-t border-neutral-100 px-5 py-2 text-xs text-neutral-500">Default range: the last six months. Ranges up to one year are supported.</p>
    </Panel>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      {data.truncated && <Notice>This range has more than 20,000 bookings; narrow the filters for complete totals.</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Bookings" value={data.totals.bookings.toLocaleString("en-IN")}/>
        <Kpi label="Completed" value={data.totals.completed}/>
        <Kpi label="Cancelled" value={data.totals.cancelled}/>
        <Kpi label="Spend" value={inr(data.totals.spend)}/>
        <Kpi label="Billed" value={inr(data.finance.billed)} hint={`${data.finance.invoices} invoice(s)`}/>
        <Kpi label="Outstanding" value={inr(data.finance.outstanding)} hint={Number(data.finance.overdue) ? `${inr(data.finance.overdue)} overdue` : undefined}/>
        <Kpi label="GST invoiced" value={inr(data.finance.invoiceTax)} hint={`on taxable ${inr(data.finance.invoiceTaxable)}`}/>
        <Kpi label="Approvals" value={data.approvals.reduce((s, a) => s + a.count, 0)} hint={`${approvals("APPROVED")} approved · ${approvals("REJECTED")} rejected`}/>
      </div>
      <p className="text-xs text-neutral-500">GST invoiced is from issued invoices (authoritative). Trips not yet invoiced carry GST in their quoted fare ({inr(data.finance.bookedTax)} across non-cancelled trips in range); unbilled completed trips total {inr(data.finance.unbilled)}.</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Spend by month"><Bars label="Spend by month" value="spend" rows={data.byMonth.map((r) => ({ label: monthName(r.key), v: Number(r.spend) }))} format={(v) => inr(v)}/><Table rows={data.byMonth} first="Month"/></Panel>
        <Panel title="Branch travel and spend"><Bars label="Spend by branch" value="spend" rows={data.byBranch.map((r) => ({ label: r.name ?? r.key, v: Number(r.spend) }))} format={(v) => inr(v)}/><Table rows={data.byBranch} first="Branch"/></Panel>
        <Panel title="Department travel and spend"><Bars label="Spend by department" value="spend" rows={data.byDepartment.map((r) => ({ label: r.name ?? r.key, v: Number(r.spend) }))} format={(v) => inr(v)}/><Table rows={data.byDepartment} first="Department"/></Panel>
        <Panel title="Service usage"><Bars label="Bookings by service" value="bookings" rows={data.byService.map((r) => ({ label: statusText(r.key), v: r.bookings }))} format={(v) => v.toLocaleString("en-IN")}/><Table rows={data.byService} first="Service"/></Panel>
      </div>
      <Panel title="Employee travel and spend" description="Top 25 travellers by spend.">{data.byEmployee.length ? <Table rows={data.byEmployee} first="Employee"/> : <Empty>No trips in this range.</Empty>}</Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Trip outcomes"><div className="flex flex-wrap gap-3 p-5">{data.byStatus.length ? data.byStatus.map((s) => <span key={s.key} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">{statusText(s.key)} <strong className="ml-1">{s.count}</strong></span>) : <span className="text-sm text-neutral-500">No trips in this range.</span>}</div></Panel>
        <Panel title="Approvals and rejections" description="Requests submitted in the range.">{data.approvals.length ? <ul className="divide-y divide-neutral-100">{data.approvals.map((a) => <li key={a.key} className="flex justify-between px-5 py-3 text-sm"><span>{statusText(a.key)} · {a.count}</span><span className="font-medium">{inr(a.amount)}</span></li>)}</ul> : <Empty>No approval requests in this range.</Empty>}</Panel>
      </div>
    </>}</DataState>
  </>;
}
