"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Empty, Field, Notice, Pager, Pill, inr, num, send, when, words } from "@/components/admin/kit";
import { exportCsv, RecordRow } from "@/components/admin/RecordTable";

type Col = { key: string; title: string; kind?: "money" | "number" | "date" | "text" | "percent" };
type Result = { columns: Col[]; rows: Record<string, unknown>[]; totals?: Record<string, number>; total: number; page: number; totalPages: number; note?: string };

const REPORTS: [string, string][] = [["booking", "Bookings"], ["revenue", "Daily revenue"], ["payment", "Payments"], ["corporate", "Corporate"], ["vendor", "Vendors"], ["vehicle", "Vehicle utilisation"], ["driver", "Drivers & trips"], ["cancellation", "Cancellations"], ["gst", "GST"]];
const STATUS_KEYS = new Set(["status", "paymentStatus"]);

function cellValue(c: Col, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (c.kind === "money") return inr(Number(v), 2);
  if (c.kind === "number") return num(Number(v));
  if (c.kind === "percent") return `${Number(v)}%`;
  if (c.kind === "date") return when(String(v));
  return String(v);
}

export default function ReportsPage() {
  const [report, setReport] = useState("booking"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ report: "booking", from: "", to: "" }); const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [exporting, setExporting] = useState(false);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ report: applied.report, ...(applied.from ? { from: applied.from } : {}), ...(applied.to ? { to: applied.to } : {}), ...extra }).toString();
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await send<Result>(`/api/admin/reports?${qs({ page: String(page) })}`, "GET")); } catch (e) { setData(null); setError(e instanceof Error ? e.message : "Unable to run report."); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page]);
  useEffect(() => { void load(); }, [load]);

  const doExport = async () => {
    setExporting(true);
    try {
      const all = await send<Result>(`/api/admin/reports?${qs({ export: "1" })}`, "GET");
      exportCsv(all.rows as RecordRow[], all.columns.map(c => ({ key: c.key, title: c.title })), `ridegrid-${applied.report}-report`);
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed."); } finally { setExporting(false); }
  };

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Reports" description="Live reports computed from bookings, payments and corporate credit. The period filters by booking date (IST) — the same basis as Finance and Analytics.">
      <button className="rg-primary" disabled={!data?.rows.length || exporting} onClick={() => void doExport()}>{exporting ? "Exporting…" : "Export CSV"}</button>
    </PageHeading>
    <section className="rg-card p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ report, from, to }); }}>
      <Field label="Report"><select className="rg-input" value={report} onChange={e => setReport(e.target.value)}>{REPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="From"><input type="date" className="rg-input" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></Field>
      <Field label="To"><input type="date" className="rg-input" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></Field>
      <div className="flex items-end"><button className="rg-primary" type="submit">Run report</button></div>
    </form></section>
    {data?.note && <Notice>{data.note}</Notice>}
    {data?.totals && <section className="rg-card flex flex-wrap gap-6 px-5 py-4 text-sm">{Object.entries(data.totals).filter(([, v]) => typeof v === "number").map(([k, v]) => <div key={k}><p className="text-xs text-neutral-500">{words(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</p><p className="font-semibold">{/count|bookings/i.test(k) ? num(v) : inr(v, 2)}</p></div>)}</section>}
    {error ? <Notice tone="error">{error}</Notice> : <section className="rg-card">
      {loading && !data ? <p className="p-10 text-center text-sm text-neutral-500">Running report…</p> : !data?.rows.length ? <Empty title="No records for this period" text="Try a wider date range. Reports only include real bookings and transactions." /> : <>
        <div className="overflow-x-auto"><table className="rg-table"><thead><tr>{data.columns.map(c => <th key={c.key} className={c.kind && c.kind !== "text" && c.kind !== "date" ? "text-right" : ""}>{c.title}</th>)}</tr></thead>
          <tbody>{data.rows.map((r, i) => <tr key={i}>{data.columns.map(c => <td key={c.key} className={c.kind && c.kind !== "text" && c.kind !== "date" ? "text-right" : ""}>{STATUS_KEYS.has(c.key) && r[c.key] ? <Pill value={String(r[c.key])} /> : cellValue(c, r[c.key])}</td>)}</tr>)}</tbody></table></div>
        <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      </>}
    </section>}
  </div></DashboardLayout>;
}
