"use client";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiData } from "@/components/admin/Primitives";

export { apiData, useAdminData, DataState, label, date } from "@/components/admin/Primitives";

export const API = "/api/corporate-admin";

export function send<T = unknown>(section: string, body: Record<string, unknown>) {
  return apiData<T>(`${API}/${section}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function inr(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }) : "—";
}

export function day(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function when(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export function qs(params: Record<string, string | number | null | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
}

const TONES: Record<string, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  gray: "border-neutral-200 bg-neutral-50 text-neutral-700",
};
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  PENDING: "amber", APPROVED: "green", BOOKED: "green", REJECTED: "red", CANCELLED: "gray", EXPIRED: "gray",
  CONFIRMED: "blue", DRIVER_ASSIGNED: "blue", TRIP_STARTED: "blue", TRIP_COMPLETED: "green",
  ASSIGNED: "blue", ARRIVED_AT_PICKUP: "blue", STARTED: "blue", PASSENGER_ONBOARD: "blue", COMPLETED: "green",
  ACTIVE: "green", INACTIVE: "gray", SUSPENDED: "red", EXHAUSTED: "red", PAID: "green", PARTIAL: "amber", FAILED: "red", REFUNDED: "gray",
  AWAITING_VENDOR: "amber", VENDOR_CONFIRMED: "blue", DRIVER_ARRIVED: "blue", ALLOWED: "green", APPROVAL_REQUIRED: "amber", NOT_ALLOWED: "red",
};
const STATUS_TEXT: Record<string, string> = {
  AWAITING_VENDOR: "Awaiting vendor", VENDOR_CONFIRMED: "Vendor confirmed", DRIVER_ASSIGNED: "Driver assigned", DRIVER_ARRIVED: "Driver arrived",
  TRIP_STARTED: "Trip started", TRIP_COMPLETED: "Trip completed", ARRIVED_AT_PICKUP: "Arrived at pickup", PASSENGER_ONBOARD: "Passenger on board",
};

export function statusText(value: string) { return STATUS_TEXT[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()); }

export function Status({ value, tone }: { value: string | null | undefined; tone?: keyof typeof TONES }) {
  if (!value) return <span className="text-neutral-400">—</span>;
  return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${TONES[tone ?? STATUS_TONE[value] ?? "gray"]}`}>{statusText(value)}</span>;
}

export function PageHeader({ title, description, children, back }: { title: string; description?: string; children?: ReactNode; back?: { href: string; label: string } }) {
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {back ? <Link href={back.href} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><ChevronLeft size={14}/>{back.label}</Link> : <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-red-600">Corporate travel</p>}
      <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">{description}</p>}
    </div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>;
}

export function Kpi({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: string; href?: string; tone?: "alert" }) {
  const body = <><p className="text-xs font-medium text-neutral-500">{label}</p><p className={`mt-2 break-words text-xl font-semibold tabular-nums tracking-tight 2xl:text-2xl ${tone === "alert" ? "text-red-700" : ""}`}>{value}</p>{hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}</>;
  return href ? <Link href={href} className="rg-card block p-4 transition hover:border-red-200">{body}</Link> : <div className="rg-card p-4">{body}</div>;
}

export function Panel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rg-card ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4"><div><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-neutral-500">{children}</p>;
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3 text-sm">
    <span className="text-neutral-500">Page {page} of {pages} · {total.toLocaleString("en-IN")} records</span>
    <div className="flex gap-2">
      <button className="rg-icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button>
      <button className="rg-icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16}/></button>
    </div>
  </nav>;
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); previous?.focus(); };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Rendered at body level so the overlay covers the header and sidebar.
  return createPortal(<div className="rg-admin fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4"><h2 id={titleId} className="font-semibold">{title}</h2><button className="rg-icon" onClick={onClose} aria-label="Close"><X size={16}/></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 px-5 py-4">{footer}</div>}
    </div>
  </div>, document.body);
}

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return <label className={`block text-sm ${className}`}><span className="mb-1.5 block font-medium text-neutral-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}</label>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const cls = tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-50 text-neutral-700";
  return <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

export function Detail({ items }: { items: [string, ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">{items.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs font-medium text-neutral-500">{k}</dt><dd className="mt-1 break-words text-sm">{v ?? "—"}</dd></div>)}</dl>;
}

export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run<T>(fn: () => Promise<T>) {
    setBusy(true); setError("");
    try { return await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save."); return undefined; }
    finally { setBusy(false); }
  }
  return { busy, error, setError, run };
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replaceAll('"', '""')}"` : s; };
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
