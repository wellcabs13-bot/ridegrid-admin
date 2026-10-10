"use client";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react";

// Shared Super Admin building blocks. Styling follows the existing rg-* system.

export const inr = (value: number | string | null | undefined, digits = 0) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? "—" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
// Lakh / crore form for tiles where the full amount would not fit (the exact value goes in a tooltip).
export const inrCompact = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const v = Number(value), abs = Math.abs(v);
  return abs >= 1e7 ? `₹${(v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr` : abs >= 1e5 ? `₹${(v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L` : inr(v);
};
export const num = (value: number | null | undefined) => (value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN"));
export const when = (value?: string | Date | null, withTime = true) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", withTime ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" });
};
export const words = (value?: string | null) => (value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "—");

const ACCENTS = {
  red: "bg-red-50 text-red-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", slate: "bg-slate-100 text-slate-600",
} as const;
export type Accent = keyof typeof ACCENTS;

// KPI tile: tinted icon square, small label, bold value, optional hint / delta.
export function Kpi({ label, value, hint, href, tone, icon: Icon, accent = "slate", delta }: {
  label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "warn" | "bad" | "good";
  icon?: LucideIcon; accent?: Accent; delta?: { value: number | null; suffix?: string; invert?: boolean };
}) {
  const toneClass = tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-neutral-950";
  const d = delta && delta.value !== null && Number.isFinite(delta.value) ? delta : null;
  const up = d ? d.value! >= 0 : true, good = d ? (d.invert ? !up : up) : true;
  const body = <div className="rg-card flex h-full items-start gap-2.5 p-3.5 transition hover:border-neutral-300 hover:shadow-md">
    {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent]}`}><Icon size={18} /></span>}
    <div className="min-w-0">
      <p className="text-xs font-medium leading-4 text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-[21px] font-bold leading-7 tracking-tight ${toneClass}`}>{value}</p>
      {d && <p className={`mt-0.5 text-[11px] font-semibold ${good ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(d.value!).toLocaleString("en-IN", { maximumFractionDigits: 1 })}{d.suffix ?? "%"}</p>}
      {hint && <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">{hint}</p>}
    </div>
  </div>;
  return href ? <Link href={href} className="block h-full" aria-label={`${label}: open`}>{body}</Link> : body;
}

const PILL: Record<string, string> = {
  CONFIRMED: "bg-blue-50 text-blue-700", DRIVER_ASSIGNED: "bg-violet-50 text-violet-700", TRIP_STARTED: "bg-orange-50 text-orange-700",
  TRIP_COMPLETED: "bg-emerald-50 text-emerald-700", CANCELLED: "bg-red-50 text-red-700", PENDING: "bg-amber-50 text-amber-700",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700", PAID: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700",
  REFUNDED: "bg-violet-50 text-violet-700", PARTIAL: "bg-orange-50 text-orange-700", ACTIVE: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700", INACTIVE: "bg-neutral-100 text-neutral-600", DELETED: "bg-neutral-100 text-neutral-600",
  VERIFIED: "bg-emerald-50 text-emerald-700", UNVERIFIED: "bg-amber-50 text-amber-700", APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700", OPEN: "bg-amber-50 text-amber-700", RESOLVED: "bg-emerald-50 text-emerald-700", CLOSED: "bg-neutral-100 text-neutral-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700", COMPLETED: "bg-emerald-50 text-emerald-700", PROCESSING: "bg-blue-50 text-blue-700",
  SENT: "bg-emerald-50 text-emerald-700", READ: "bg-neutral-100 text-neutral-600", NOT_CONFIGURED: "bg-neutral-100 text-neutral-600",
  DISABLED: "bg-neutral-100 text-neutral-600",
};
const DOT: Record<string, string> = { "bg-blue-50": "bg-blue-500", "bg-violet-50": "bg-violet-500", "bg-orange-50": "bg-orange-500", "bg-emerald-50": "bg-emerald-500", "bg-red-50": "bg-red-500", "bg-amber-50": "bg-amber-500", "bg-neutral-100": "bg-neutral-400" };
export function Pill({ value, label }: { value: string; label?: string }) {
  const cls = PILL[value] ?? "bg-neutral-100 text-neutral-700";
  const dot = DOT[cls.split(" ")[0]] ?? "bg-neutral-400";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label ?? words(value)}</span>;
}

export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="rg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5"><div><h2 className="text-[15px] font-bold tracking-tight">{title}</h2>{description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}</div>{actions}</div><div>{children}</div></section>;
}

export function Empty({ title = "Nothing here yet", text }: { title?: string; text?: string }) {
  return <div className="px-5 py-10 text-center"><p className="text-sm font-medium">{title}</p>{text && <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">{text}</p>}</div>;
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  const first = Math.max(1, Math.min(page - 2, totalPages - 4)), last = Math.min(totalPages, first + 4);
  const pages = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold";
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-5 py-3 text-xs"><span className="text-neutral-500">{total.toLocaleString("en-IN")} records · page {page} of {totalPages}</span>
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      <button className={`${btn} border-neutral-200 bg-white`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
      {pages.map(n => <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={`${btn} ${n === page ? "border-red-600 bg-red-600 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}>{n}</button>)}
      <button className={`${btn} border-neutral-200 bg-white`} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
    </nav></div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-neutral-500">{hint}</span>}</label>;
}

export function Select({ value, onChange, options, placeholder = "All" }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return <select className="rg-input" value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}

export function Drawer({ open, title, subtitle, onClose, children, footer }: { open: boolean; title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className="flex h-full w-full max-w-3xl flex-col border-l border-neutral-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4"><div><h2 className="text-lg font-semibold">{title}</h2>{subtitle && <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>}</div><button className="rg-icon" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 px-5 py-3">{footer}</div>}
    </div>
  </div>;
}

// Confirmation for sensitive actions, with an optional required reason.
export function Confirm({ open, title, message, confirmLabel = "Confirm", danger, requireReason, reasonLabel = "Reason (required, recorded in the audit log)", busy, error, onCancel, onConfirm }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; requireReason?: boolean; reasonLabel?: string; busy?: boolean; error?: string;
  onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true" aria-label={title}>
    <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-2 text-sm text-neutral-600">{message}</div>
      {requireReason && <textarea className="rg-input mt-4" rows={3} aria-label={reasonLabel} placeholder={reasonLabel} value={reason} onChange={e => setReason(e.target.value)} />}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="rg-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className={danger ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" : "rg-primary"} disabled={busy || (requireReason && !reason.trim())} onClick={() => onConfirm(reason.trim())}>{busy ? "Working…" : confirmLabel}</button></div>
    </div>
  </div>;
}

export function Notice({ tone = "info", children, onClose }: { tone?: "info" | "error" | "success"; children: ReactNode; onClose?: () => void }) {
  const cls = tone === "error" ? "bg-red-50 text-red-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
  return <div role={tone === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ${cls}`}><div>{children}</div>{onClose && <button className="text-xs underline" onClick={onClose}>Dismiss</button>}</div>;
}

export function Rows({ items }: { items: [string, ReactNode][] }) {
  return <dl className="divide-y divide-slate-200 text-sm">{items.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-neutral-500">{k}</dt><dd className="text-right font-medium">{v ?? "—"}</dd></div>)}</dl>;
}

export async function send<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(result.message || "The request could not be completed.");
  return result.data as T;
}
