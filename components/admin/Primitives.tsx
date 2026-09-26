"use client";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Inbox } from "lucide-react";

export async function apiData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(result.message || result.error || "The request could not be completed.");
  return result.data;
}
export function useAdminData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    const current = ++generation.current;
    setLoading(true); setError("");
    try { const next = await apiData<T>(url); if (current === generation.current) setData(next); }
    catch (err) { if (current === generation.current) { setData(null); setError(err instanceof Error ? err.message : "Unable to load data."); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [url]);
  useEffect(() => { void reload(); return () => { generation.current++; }; }, [reload]);
  return { data, loading, error, reload };
}
export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-red-600">RideGrid operations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">{description}</p></div><div className="flex flex-wrap gap-2">{children}</div></div>;
}
export function DataState({ loading, error, empty, onRetry, children }: { loading: boolean; error: string; empty?: boolean; onRetry: () => void; children: ReactNode }) {
  if (loading) return <div role="status" className="rg-card flex min-h-44 items-center justify-center gap-3 p-8 text-sm text-neutral-500"><RefreshCw size={18} className="animate-spin"/>Loading records…</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><p className="font-medium text-red-900">Unable to load this view</p><p className="my-3 text-sm text-red-700">{error}</p><button onClick={onRetry} className="rg-secondary">Try again</button></div>;
  if (empty) return <div className="rg-card flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center"><Inbox className="text-neutral-400"/><h2 className="font-semibold">No records yet</h2><p className="max-w-sm text-sm text-neutral-500">Records will appear here when they are available. Try adjusting your filters.</p></div>;
  return <>{children}</>;
}
export function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rg-card p-5"><p className="text-sm text-neutral-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p></div>;
}
export function Badge({ children }: { children: ReactNode }) { return <span className="inline-flex whitespace-nowrap rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-semibold text-neutral-700">{children}</span>; }
export function label(value: string) { return value.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2"); }
export function date(value?: string | null) { return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString("en-IN") : "—"; }
