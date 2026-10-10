"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
export const inputClass = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100";
export const buttonClass = "rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryClass = `${buttonClass} !border-red-600 !bg-red-600 !text-white`;
export const metric = (value: number | null | undefined) => value == null ? "Unavailable" : value.toLocaleString();
export async function searchApi<T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/website-seo/${path}`, { method, cache: "no-store", signal, ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  let result: { success?: boolean; ok?: boolean; data?: T; error?: string };
  try { result = await response.json(); } catch { throw new Error("Invalid server response. Reload and retry."); }
  if (!response.ok || !(result.success || result.ok) || result.data === undefined) throw new Error(result.error || "Request failed.");
  return result.data;
}
export function useSearchData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setData(null);
    void searchApi<T>(path, "GET", undefined, controller.signal).then(setData).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load records."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error, reload };
}
export function useMutation() {
  const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function run(work: () => Promise<void>) { if (lock.current) return; lock.current = true; setBusy(true); setError(""); setNotice(""); try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Operation failed."); } finally { lock.current = false; setBusy(false); } }
  return { busy, error, notice, setNotice, run };
}
export function SearchHeading({ title, action }: { title: string; action?: ReactNode }) { return <div className="bg-zinc-950 px-6 py-9 lg:px-8"><div className="mx-auto max-w-7xl"><WebsiteSeoSectionHeader eyebrow="Search Intelligence" title={title} description="W4 keyword intelligence and recorded search observations, with clear source attribution." action={action} /></div></div>; }
export function Feedback({ error, notice, loading }: { error?: string; notice?: string; loading?: boolean }) { return <>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-white p-4 text-sm">{notice}</p>}{loading && <p role="status" className="text-sm text-zinc-500">Loading stored data…</p>}</>; }
export function ProviderNotice() { return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">External ranking and AI visibility provider: UNAVAILABLE. Recorded observations are supplied by admins or integrations; RideGrid has not independently verified their claims.</p>; }
export function FactoryLink({ id, type, name }: { id: string; type: string; name: string }) {
  const routes: Record<string, string> = { ROUTE: "routes", CITY: "cities", SERVICE: "services", AIRPORT: "airports", AREA: "areas", VEHICLE: "vehicles" };
  return routes[type] ? <Link className="font-bold text-red-600" href={`/website-seo/page-factory/${routes[type]}?entityId=${encodeURIComponent(id)}`}>{name}</Link> : <span>{name}</span>;
}
export const contentClass = "mx-auto max-w-7xl space-y-6 px-6 py-7 lg:px-8";
export const tableClass = "w-full text-left text-sm [&_th]:bg-zinc-100 [&_th]:p-3 [&_td]:border-b [&_td]:border-zinc-100 [&_td]:p-3";
