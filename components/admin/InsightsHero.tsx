"use client";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Sparkles, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/admin/insights";

const TONE = {
  critical: { icon: AlertTriangle, color: "text-red-400", ring: "bg-red-500/15" },
  warn: { icon: AlertTriangle, color: "text-amber-300", ring: "bg-amber-400/15" },
  good: { icon: TrendingUp, color: "text-emerald-300", ring: "bg-emerald-400/15" },
  info: { icon: Info, color: "text-sky-300", ring: "bg-sky-400/15" },
} as const;
const TAG = { High: "bg-red-500/20 text-red-200", Medium: "bg-amber-400/20 text-amber-200", Low: "bg-white/10 text-neutral-300", Info: "bg-sky-400/15 text-sky-200" } as const;

// Dark "insights" panel. Items come only from lib/admin/insights (deterministic rules on real
// data). Nothing is padded: with no signals it says so.
export default function InsightsHero({ insights, loading, limit = 4, cta = true }: { insights: Insight[]; loading?: boolean; limit?: number; cta?: boolean }) {
  const shown = insights.slice(0, limit);
  return <section className="rg-hero p-5 sm:p-6" aria-label="RideGrid insights">
    <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/10" />
    <div className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 rounded-full border border-white/10" />
    <div className="relative flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-red-600 shadow-lg shadow-red-900/40"><Sparkles size={20} /></span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold tracking-tight">RideGrid Insights</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live data</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-neutral-300">Rules-based</span></div>
        <p className="mt-0.5 text-[13px] text-neutral-400">Signals computed from your real bookings, payments and fleet.</p>
      </div>
    </div>
    <ul className="relative mt-4 space-y-2">
      {loading && !shown.length ? [0, 1, 2].map(i => <li key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />) : shown.length ? shown.map(i => {
        const t = TONE[i.tone], Icon = t.icon;
        const body = <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 transition hover:bg-white/[0.08]">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.ring} ${t.color}`}><Icon size={15} /></span>
          <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold leading-5 text-white">{i.title}</p>{i.detail && <p className="mt-0.5 text-xs leading-4 text-neutral-400">{i.detail}</p>}</div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${TAG[i.priority]}`}>{i.priority}</span>
        </div>;
        return <li key={i.id}>{i.href ? <Link href={i.href} className="block">{body}</Link> : body}</li>;
      }) : <li className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-4"><CheckCircle2 size={20} className="text-emerald-300" /><div><p className="text-[13px] font-semibold">All clear</p><p className="text-xs text-neutral-400">Nothing needs attention right now. New signals appear here as your data changes.</p></div></li>}
    </ul>
    {cta && <Link href="/ai" className="rg-primary relative mt-4 !inline-flex">View all insights <ArrowRight size={15} /></Link>}
  </section>;
}
