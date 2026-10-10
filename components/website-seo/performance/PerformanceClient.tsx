"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import { useSearchData, Feedback, tableClass, buttonClass } from "../search-intelligence/shared";
import { WEBSITE_KEYWORD_INTENTS, WEBSITE_KEYWORD_TYPES, WEBSITE_KEYWORD_STATUSES } from "@/lib/website-seo/keywords/types";
import { WINDOWS, type PerformanceReport, type ReportRow } from "@/lib/website-seo/performance/types";

function display(value: ReportRow[string]) {
  if (value === null || value === undefined) return "UNAVAILABLE";
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (/^\d{4}-\d\d-\d\dT/.test(value)) return new Date(value).toLocaleString();
  return value;
}
function label(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase()); }
function Table({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return <p className="py-6 text-sm text-zinc-500">NO OBSERVATIONS / no matching records. No metrics have been inferred.</p>;
  const columns = Object.keys(rows[0]).filter(k => !["id", "keywordId", "pageId", "competitorId", "matchingRecords"].includes(k));
  return <div className="mt-4 overflow-x-auto"><table className={tableClass}><thead><tr>{columns.map(k => <th scope="col" key={k} className="whitespace-nowrap">{label(k)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={String(row.id ?? i)}>{columns.map(k => <td key={k} className="min-w-28 max-w-sm break-words">{display(row[k])}</td>)}</tr>)}</tbody></table></div>;
}
export default function PerformanceClient({ view = "overview" }: { view?: string }) {
  const router = useRouter(), pathname = usePathname(), query = useSearchParams();
  const window = query.get("window") || "30D";
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ window, offset: String(offset), ...filters });
  const endpoint = ["conversions", "revenue"].includes(view) ? "conversions" : view === "traffic" ? "overview" : view;
  const { data, error, loading, reload } = useSearchData<PerformanceReport>(`performance/${endpoint}?${params}`);
  const title = ({ overview: "Performance Center", traffic: "Traffic Analytics", conversions: "Conversion Attribution", revenue: "Revenue Attribution", keywords: "Keyword Performance", pages: "Page Performance" } as Record<string, string>)[view];
  function filter(key: string, value: string) { setFilters(current => ({ ...current, [key]: value })); setOffset(0); }
  const list = view === "keywords" || view === "pages";
  const select = (key: string, choices: readonly string[]) => <label key={key} className="text-xs font-bold text-zinc-600">{label(key)}<select className="mt-1 block w-full rounded-lg border bg-white p-2 text-sm" value={filters[key] || ""} onChange={e => filter(key, e.target.value)}><option value="">All</option>{choices.map(c => <option key={c} value={c}>{c}</option>)}</select></label>;
  return <><div className="bg-zinc-950 px-6 py-8"><div className="mx-auto max-w-7xl"><WebsiteSeoSectionHeader eyebrow="Website & SEO · Performance" title={title} description="Real website inventory and recorded search intelligence. Missing analytics stay unavailable." action={<div className="flex items-center gap-3"><label className="text-sm text-white">Window <select aria-label="Performance window" className="ml-2 rounded-lg bg-white p-2 text-zinc-950" value={window} onChange={e => { setOffset(0); router.replace(`${pathname}?window=${e.target.value}`); }}>{WINDOWS.map(w => <option key={w}>{w}</option>)}</select></label><button className={buttonClass} onClick={reload} disabled={loading}>Reload</button></div>} /></div></div>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6"><Feedback error={error} loading={loading} />
      {["traffic", "conversions", "revenue"].includes(view) && <WebsiteSeoCard><h2 className="text-xl font-black">{title}</h2><span className="my-3 inline-block rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Status: {view === "traffic" ? "NOT CONNECTED" : "NOT ATTRIBUTED"}</span><p className="text-sm leading-6 text-zinc-600">{view === "traffic" ? "No verified external analytics provider is configured. Visits, users, sessions, clicks, impressions and CTR are unavailable. The website inventory below is non-traffic data." : view === "conversions" ? "Bookings exist elsewhere in RideGrid, but there is currently no verified mapping from a Website SEO page or keyword to a conversion. WEBSITE booking-source totals cannot establish SEO conversions." : "No verified SEO page or keyword attribution exists for revenue. Total RideGrid revenue cannot establish Website SEO revenue."}</p></WebsiteSeoCard>}
      {list && <WebsiteSeoCard><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><label className="text-xs font-bold text-zinc-600">Search<input className="mt-1 block w-full rounded-lg border p-2 text-sm" placeholder={view === "pages" ? "Page pathname" : "Keyword"} value={filters.search || ""} onChange={e => filter("search", e.target.value)} /></label>
        {select("status", view === "pages" ? ["DRAFT", "READY", "PUBLISHED", "ARCHIVED"] : WEBSITE_KEYWORD_STATUSES)}{select("entityType", ["ROUTE", "CITY", "SERVICE", "AIRPORT", "AREA", "VEHICLE"])}
        {view === "keywords" ? <>{select("intent", WEBSITE_KEYWORD_INTENTS)}{select("type", WEBSITE_KEYWORD_TYPES)}{select("ranking", ["observed", "unobserved"])}{select("opportunity", ["available", "unavailable"])}{select("sort", ["opportunityScore", "searchVolume", "latestRank", "rankChange"])}</> : select("coverage", ["UNKNOWN", "INDEXED", "NOT_INDEXED", "DISCOVERED", "CRAWLED", "BLOCKED", "ERROR"])}</div></WebsiteSeoCard>}
      {data && <><p className="text-xs text-zinc-500">Observations: {new Date(data.from).toLocaleString()} – {new Date(data.to).toLocaleString()}. Inventory and W7 coverage show current stored state. Observations may be manual or provider supplied.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(data.cards).map(([key, value]) => <WebsiteSeoCard key={key}><p className="text-xs font-bold uppercase text-zinc-500">{key}</p><p className="mt-3 break-words text-xl font-black">{key === "Latest Observation" && value === null ? "NO OBSERVATIONS" : display(value)}</p></WebsiteSeoCard>)}</div>
        {data.sections.map(section => <WebsiteSeoCard key={section.title}><h2 className="text-lg font-black">{section.title}</h2>{section.note && <p className="mt-2 text-sm text-zinc-500">{section.note}</p>}<Table rows={section.rows} /></WebsiteSeoCard>)}
        {list && <div className="flex items-center justify-between gap-3 text-sm"><button className={buttonClass} disabled={offset === 0 || loading} onClick={() => setOffset(n => Math.max(0, n - 100))}>Previous</button><span>Page {offset / 100 + 1} · {data.sections[0]?.rows[0]?.matchingRecords ?? 0} matching records</span><button className={buttonClass} disabled={loading || offset + 100 >= Number(data.sections[0]?.rows[0]?.matchingRecords ?? 0)} onClick={() => setOffset(n => n + 100)}>Next</button></div>}
      </>}
      <div className="flex flex-wrap gap-3"><Link className={buttonClass} href="/website-seo/website/pages">Website Manager → Pages</Link><Link className={buttonClass} href="/website-seo/website/publishing">Website Manager → Publishing</Link></div>
    </div></>;
}
