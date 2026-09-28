"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Info } from "lucide-react";

type Row = { id: string; name: string; type: string; url: string; path: string; status: string; indexable: boolean; indexNote: string | null; canonical: string; inSitemap: boolean; updatedAt: string | null; seoScore: number; seoMissing: string[]; editHref: string };
type Overview = {
  totals: { pages: number; published: number; drafts: number; indexable: number; inSitemap: number; needsSeo: number };
  byType: { type: string; total: number; published: number }[];
  googleIndexing: { connected: boolean; message: string };
  rows: Row[]; total: number; page: number; totalPages: number;
};

const TYPE_LABELS: Record<string, string> = { HOMEPAGE: "Homepage", LEGAL_INFO: "Info & legal", CITY: "Cities", ROUTE: "Routes", AREA: "Areas", SERVICE: "Services", AIRPORT: "Airports", VEHICLE: "Vehicles", TOUR: "Tours" };
const typeLabel = (t: string) => TYPE_LABELS[t] ?? t.charAt(0) + t.slice(1).toLowerCase().replaceAll("_", " ");

const TOOLS: { group: string; items: [string, string, string][] }[] = [
  { group: "Website", items: [["Homepage", "/website-seo/website/homepage", "Hero, sections and featured content"], ["Pages", "/website-seo/website/pages", "Edit and publish individual pages"], ["Navigation", "/website-seo/website/navigation", "Header and footer menus"], ["Media & images", "/website-seo/website/media", "Upload and choose page images"]] },
  { group: "SEO", items: [["Page SEO", "/website-seo/seo", "Titles, descriptions, canonical, robots"], ["Keywords", "/website-seo/search-intelligence/keywords", "Keywords assigned to pages"], ["Sitemap", "/sitemap.xml", "Live sitemap submitted to search engines"], ["Redirects / legacy URLs", "/website-seo/seo/redirects", "Old URLs and where they point"]] },
];

export default function WebsiteSeoOverview() {
  const [type, setType] = useState(""); const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [applied, setApplied] = useState({ type: "", status: "", q: "" });
  const [page, setPage] = useState(1); const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const url = useMemo(() => `/api/website-seo/overview?${new URLSearchParams(Object.fromEntries(Object.entries({ ...applied, page: String(page) }).filter(([, v]) => v)) as Record<string, string>)}`, [applied, page]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await fetch(url, { cache: "no-store" }); const j = await r.json(); if (!r.ok || !j.success) throw new Error(j.message || j.error || "Unable to load."); setData(j.data); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load."); } finally { setLoading(false); }
  }, [url]);
  useEffect(() => { void load(); }, [load]);
  const pick = (t: string) => { setType(t); setPage(1); setApplied(a => ({ ...a, type: t })); };

  return <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8">
    <div><h1 className="text-2xl font-black text-zinc-900">Website & SEO overview</h1><p className="mt-1 text-sm text-zinc-600">Every public page, whether it is live, whether search engines may index it, and whether it is in the sitemap.</p></div>

    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status"><Info size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{data?.googleIndexing.message ?? "Google indexing status unavailable until Search Console is connected."}</p><p className="mt-1 text-amber-800">“Indexable” means RideGrid allows search engines to index the page and “In sitemap” means it is listed in /sitemap.xml. Whether Google has actually indexed a page is not known here.</p></div></div>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button className="underline" onClick={() => void load()}>Retry</button></div>}

    {data && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{([["Total pages", data.totals.pages], ["Published", data.totals.published], ["Drafts", data.totals.drafts], ["Indexable", data.totals.indexable], ["In sitemap", data.totals.inSitemap], ["SEO incomplete", data.totals.needsSeo]] as [string, number][]).map(([l, v]) => <div key={l} className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-semibold text-zinc-500">{l}</p><p className="mt-1 text-2xl font-black text-zinc-900">{v.toLocaleString("en-IN")}</p></div>)}</div>}

    {data && <div className="flex flex-wrap gap-2"><button onClick={() => pick("")} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${!applied.type ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700"}`}>All pages</button>{data.byType.map(t => <button key={t.type} onClick={() => pick(t.type)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${applied.type === t.type ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700"}`}>{typeLabel(t.type)} · {t.total}</button>)}</div>}

    <section className="rounded-xl border border-zinc-200 bg-white">
      <form className="flex flex-wrap items-end gap-3 border-b border-zinc-100 p-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ type, status, q: q.trim() }); }}>
        <label className="text-xs font-semibold text-zinc-600">Search<input className="mt-1 block w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900" value={q} onChange={e => setQ(e.target.value)} placeholder="Page name or URL" /></label>
        <label className="text-xs font-semibold text-zinc-600">Show<select className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900" value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option value="PUBLISHED">Published</option><option value="DRAFT">Drafts</option><option value="NOT_INDEXABLE">Not indexable</option></select></label>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white" type="submit">Apply</button>
      </form>
      {loading && !data ? <p className="p-10 text-center text-sm text-zinc-500">Loading pages…</p> : !data?.rows.length ? <p className="p-10 text-center text-sm text-zinc-500">No pages match these filters.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr>{["Page", "Type", "Status", "Indexable", "In sitemap", "Canonical", "SEO", "Updated", ""].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-100">{data.rows.map(p => <tr key={p.id} className="align-top">
            <td className="px-4 py-3"><p className="font-semibold text-zinc-900">{p.name}</p><p className="text-xs text-zinc-500">{p.path}</p></td>
            <td className="px-4 py-3 text-xs text-zinc-700">{typeLabel(p.type)}</td>
            <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${p.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>{p.status === "PUBLISHED" ? "Published" : p.status === "DRAFT" ? "Draft" : "Archived"}</span></td>
            <td className="px-4 py-3 text-xs">{p.indexable ? <span className="font-semibold text-emerald-700">Yes</span> : <span className="text-amber-700" title={p.indexNote ?? ""}>No{p.indexNote ? ` — ${p.indexNote}` : ""}</span>}</td>
            <td className="px-4 py-3 text-xs">{p.inSitemap ? "Yes" : "No"}</td>
            <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-600" title={p.canonical}>{p.canonical === p.url ? "Self" : p.canonical}</td>
            <td className="px-4 py-3 text-xs"><span className={`font-bold ${p.seoScore === 100 ? "text-emerald-700" : p.seoScore >= 70 ? "text-amber-700" : "text-red-700"}`}>{p.seoScore}%</span>{p.seoMissing.length > 0 && <p className="text-zinc-500">Missing: {p.seoMissing.join(", ")}</p>}</td>
            <td className="px-4 py-3 text-xs text-zinc-600">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-IN") : "Site release"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-xs">{p.status === "PUBLISHED" ? <a className="inline-flex items-center gap-1 font-semibold text-red-700" href={p.path} target="_blank" rel="noreferrer">View live <ExternalLink size={12} /></a> : <span className="text-zinc-500">Preview in editor</span>}<Link className="ml-3 font-semibold text-zinc-800 underline" href={p.editHref}>Edit</Link></td>
          </tr>)}</tbody></table></div>}
      {data && data.totalPages > 1 && <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm"><span className="text-zinc-500">{data.total} pages · page {data.page} of {data.totalPages}</span><div className="flex gap-2"><button className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button></div></div>}
    </section>

    <div className="grid gap-4 md:grid-cols-2">{TOOLS.map(g => <section key={g.group} className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="text-sm font-black uppercase tracking-wider text-zinc-500">{g.group}</h2><ul className="mt-3 divide-y divide-zinc-100">{g.items.map(([label, href, hint]) => <li key={href}>{href.endsWith(".xml") ? <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between py-2.5 text-sm hover:text-red-700"><span className="font-semibold text-zinc-900">{label}</span><span className="text-xs text-zinc-500">{hint}</span></a> : <Link href={href} className="flex items-center justify-between py-2.5 text-sm hover:text-red-700"><span className="font-semibold text-zinc-900">{label}</span><span className="text-xs text-zinc-500">{hint}</span></Link>}</li>)}</ul></section>)}</div>
    <p className="text-xs text-zinc-500">Advanced tools (page factory, automation, AI content control, search intelligence and performance) run automatically and are available under <Link className="underline" href="/website-seo/settings">Advanced</Link>.</p>
  </div>;
}
