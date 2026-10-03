"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import { loadFactoryInventory } from "@/lib/website-seo/page-factory/client";
import { FACTORY_STEPS, type FactoryInventory, type FactoryRun, type ReadinessResult } from "@/lib/website-seo/page-factory/types";

export const inputClass = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100";
export const buttonClass = "inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-800 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryClass = `${buttonClass} !border-red-600 !bg-red-600 !text-white hover:!bg-red-700`;

export function useFactoryInventory() {
  const [data, setData] = useState<FactoryInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await loadFactoryInventory(); setData(result); return result; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to load the factory."); throw failure; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload().catch(() => undefined); }, [reload]);
  return { data, loading, error, reload };
}

export function FactoryHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="bg-zinc-950 px-6 py-9 lg:px-8"><div className="mx-auto max-w-7xl"><WebsiteSeoSectionHeader eyebrow="Page Factory" title={title} description={description} action={action} /></div></div>;
}
export function Feedback({ error, notice }: { error?: string; notice?: string }) {
  return <>{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}{notice && <div role="status" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">{notice}</div>}</>;
}
export function Handoff() {
  return <div className="flex flex-wrap gap-3"><Link className={buttonClass} href="/website-seo/website/pages">Website Manager → Pages</Link><Link className={buttonClass} href="/website-seo/website/publishing">Publishing Manager →</Link></div>;
}
export function ResultDetails({ title, data }: { title: string; data: unknown }) {
  return <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><summary className="cursor-pointer text-sm font-bold">{title}</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(data, null, 2)}</pre></details>;
}
export function ReadinessPanel({ result }: { result: ReadinessResult }) {
  return <WebsiteSeoCard><h3 className="font-black">Readiness: {result.readiness.ready ? "READY" : "BLOCKED"}</h3>
    <div className="mt-3 space-y-2 text-sm">
      <p className="break-all">Canonical: {result.plan.canonical.url || result.plan.canonical.path || "Unavailable"}</p>
      <p>Public path: {result.discovery.url.path || result.plan.canonical.path || "Unavailable"}</p>
      <p>Projected indexability: {result.plan.indexability.indexable ? "Indexable" : "Noindex"}</p>
      <p>Projected sitemap eligibility: {result.plan.sitemapEligibility.eligible ? "Eligible" : "Ineligible"}</p>
      <p>Currently included in sitemap: {result.discovery.sitemapIncluded ? "Yes" : "No"}</p>
      <h4 className="pt-2 font-bold">Blocking issues</h4>{result.readiness.blockingIssues.length ? <ul className="list-disc space-y-1 pl-5 text-red-700">{result.readiness.blockingIssues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul> : <p>None returned.</p>}
      <h4 className="pt-2 font-bold">Warnings</h4>{result.readiness.warnings.length ? <ul className="list-disc space-y-1 pl-5 text-amber-700">{result.readiness.warnings.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul> : <p>None returned.</p>}
    </div></WebsiteSeoCard>;
}
export function RunDetails({ run }: { run: FactoryRun }) {
  return <div className="space-y-3" aria-live="polite">{FACTORY_STEPS.map((key) => <div key={key} className="rounded-xl border border-zinc-200 p-3"><p className="text-sm font-bold uppercase">{key} · {run.steps[key].state}</p>{run.steps[key].message && <p className="mt-1 text-sm text-zinc-600">{run.steps[key].message}</p>}{run.steps[key].data !== undefined && <div className="mt-2"><ResultDetails title="Inspect engine result" data={run.steps[key].data} /></div>}</div>)}</div>;
}
