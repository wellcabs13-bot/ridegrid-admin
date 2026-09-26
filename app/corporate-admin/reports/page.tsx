"use client";
import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { API, DataState, downloadCsv, Empty, inr, Kpi, Notice, PageHeader, Panel, qs, statusText, useAdminData } from "@/components/corporate-admin/ui";

type Row = { key: string; bookings: number; completed: number; cancelled: number; spend: string; name?: string; code?: string };
type Report = {
  range: { from: string; to: string }; truncated: boolean;
  totals: { bookings: number; spend: string; creditSpend: string };
  byMonth: Row[]; byDepartment: Row[]; byEmployee: Row[]; byService: Row[];
  byStatus: { key: string; count: number }[]; approvals: { key: string; count: number }[];
};
type Options = { branches: { id: string; branchName: string }[]; departments: { id: string; departmentName: string }[] };

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
  return <div className="overflow-x-auto border-t border-neutral-100"><table className="rg-table"><thead><tr><th>{first}</th><th className="text-right">Bookings</th><th className="text-right">Completed</th><th className="text-right">Cancelled</th><th className="text-right">Spend</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key}><td>{r.name ?? (first === "Month" ? monthName(r.key) : statusText(r.key))}{r.code ? <span className="ml-1 text-xs text-neutral-500">{r.code}</span> : null}</td><td className="text-right">{r.bookings}</td><td className="text-right">{r.completed}</td><td className="text-right">{r.cancelled}</td><td className="text-right">{inr(r.spend)}</td></tr>)}</tbody></table></div>;
}

export default function ReportsPage() {
  const blank = { from: "", to: "", branchId: "", departmentId: "", service: "", status: "" };
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const { data: o } = useAdminData<Options>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<Report>(`${API}/reports${qs(f)}`);
  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [["Section", "Item", "Bookings", "Completed", "Cancelled", "Spend (INR)"]];
    const add = (section: string, list: Row[], name: (r: Row) => string) => list.forEach((r) => rows.push([section, name(r), r.bookings, r.completed, r.cancelled, r.spend]));
    add("Month", data.byMonth, (r) => r.key); add("Department", data.byDepartment, (r) => r.name ?? r.key); add("Employee", data.byEmployee, (r) => `${r.name ?? ""} ${r.code ?? ""}`.trim()); add("Service", data.byService, (r) => r.key);
    downloadCsv(`ridegrid-travel-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }
  return <>
    <PageHeader title="Reports" description="Travel activity for your company from central RideGrid bookings. Spend excludes cancelled bookings and is grouped by pickup date (India time).">
      <button className="rg-secondary" disabled={!data} onClick={exportCsv}><Download size={15}/>Export CSV</button>
    </PageHeader>
    <Panel title="Filters" action={<button className="rg-secondary" onClick={() => setF(blank)}><RotateCcw size={14}/>Reset</button>}>
      <div className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
        <label className="text-xs text-neutral-500">From<input type="date" className="rg-input mt-1" value={f.from} onChange={set("from")}/></label>
        <label className="text-xs text-neutral-500">To<input type="date" className="rg-input mt-1" value={f.to} onChange={set("to")}/></label>
        <label className="text-xs text-neutral-500">Branch<select className="rg-input mt-1" value={f.branchId} onChange={set("branchId")}><option value="">All</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Department<select className="rg-input mt-1" value={f.departmentId} onChange={set("departmentId")}><option value="">All</option>{o?.departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Service<select className="rg-input mt-1" value={f.service} onChange={set("service")}><option value="">All</option><option value="LOCAL">Local</option><option value="ONE_WAY">One way</option><option value="ROUNDTRIP">Round trip</option></select></label>
        <label className="text-xs text-neutral-500">Booking status<select className="rg-input mt-1" value={f.status} onChange={set("status")}><option value="">All</option>{["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED", "TRIP_COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{statusText(s)}</option>)}</select></label>
      </div>
      <p className="border-t border-neutral-100 px-5 py-2 text-xs text-neutral-500">Default range: the last six months. Ranges up to one year are supported.</p>
    </Panel>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      {data.truncated && <Notice>This range has more than 20,000 bookings; narrow the filters for complete totals.</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Bookings" value={data.totals.bookings.toLocaleString("en-IN")}/>
        <Kpi label="Spend" value={inr(data.totals.spend)}/>
        <Kpi label="Paid by corporate credit" value={inr(data.totals.creditSpend)}/>
        <Kpi label="Approval requests" value={data.approvals.reduce((s, a) => s + a.count, 0)} hint={data.approvals.map((a) => `${a.count} ${a.key.toLowerCase()}`).join(" · ") || "None in range"}/>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Spend by month"><Bars label="Spend by month" value="spend" rows={data.byMonth.map((r) => ({ label: monthName(r.key), v: Number(r.spend) }))} format={(v) => inr(v)}/><Table rows={data.byMonth} first="Month"/></Panel>
        <Panel title="Bookings by month"><Bars label="Bookings by month" value="bookings" rows={data.byMonth.map((r) => ({ label: monthName(r.key), v: r.bookings }))} format={(v) => v.toLocaleString("en-IN")}/></Panel>
        <Panel title="Department usage"><Bars label="Spend by department" value="spend" rows={data.byDepartment.map((r) => ({ label: r.name ?? r.key, v: Number(r.spend) }))} format={(v) => inr(v)}/><Table rows={data.byDepartment} first="Department"/></Panel>
        <Panel title="Service usage"><Bars label="Bookings by service" value="bookings" rows={data.byService.map((r) => ({ label: statusText(r.key), v: r.bookings }))} format={(v) => v.toLocaleString("en-IN")}/><Table rows={data.byService} first="Service"/></Panel>
      </div>
      <Panel title="Top employees by spend" description="Up to 25 travellers.">{data.byEmployee.length ? <Table rows={data.byEmployee} first="Employee"/> : <Empty>No trips in this range.</Empty>}</Panel>
      <Panel title="Trip outcomes"><div className="flex flex-wrap gap-3 p-5">{data.byStatus.length ? data.byStatus.map((s) => <span key={s.key} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">{statusText(s.key)} <strong className="ml-1">{s.count}</strong></span>) : <span className="text-sm text-neutral-500">No trips in this range.</span>}</div></Panel>
    </>}</DataState>
  </>;
}
