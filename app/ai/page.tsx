"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Empty, Kpi, Notice, Pill, Section, inr, num, when, words } from "@/components/admin/kit";
import InsightsHero from "@/components/admin/InsightsHero";
import { chart } from "@/components/admin/chart-theme";
import { buildInsights, type Insight } from "@/lib/admin/insights";
import { Activity, Bot, Building2, CarFront, ChevronDown, ListChecks, ShieldCheck, Sparkles, UserRound, Workflow } from "lucide-react";

type Dashboard = {
  generatedAt: string;
  revenue: { refundsDueAmount: number };
  people: { activeVendors: number; verifiedVendors: number; pendingVendors: number; activeVehicles: number; activeDrivers: number };
  attention: { pendingApprovals: number; staleHolds: number; upcoming24hNoDriver: number; refundsDue: number; openTickets: number; failedPayments: number };
  marketplace: { bookableVehicles: number; activeVehicles: number };
};
type Rank = { bookings: number; value: number };
type Analytics = {
  period: { days: number };
  series: { day: string; bookings: number; value: number; cancelled: number; corporate: number; retail: number }[];
  routes: (Rank & { route: string })[]; services: (Rank & { service: string })[]; categories: (Rank & { category: string })[]; topVendors: (Rank & { name: string })[];
  cancellations: { cancelled: number; total: number; rate: number | null };
  payu: { attempts: number; successRate: number | null };
};
type AiView = { textAi: { configured: boolean; provider: string | null; model: string | null }; imageAi: { configured: boolean }; capabilities: { name: string; kind: "AI" | "RULES"; status: string; note: string }[] };
type AutoView = {
  rules: { id: string; name: string; status: string; trigger: string; channel: string; enabled: boolean; requires: string | null; executed30d: number; failed30d: number; lastRunAt: string | null }[];
  failed: { id: string }[]; retry: { status: string; count: number }[];
};

const TABS = [["overview", "Overview"], ["insights", "Smart insights"], ["demand", "Demand & routes"], ["fleet", "Fleet & supply"], ["automation", "Automation"], ["providers", "Providers"]] as const;
type Tab = (typeof TABS)[number][0];

function InsightList({ items }: { items: Insight[] }) {
  if (!items.length) return <Empty title="All clear" text="No rule is currently firing. Signals appear here when your live data crosses a threshold." />;
  return <ul className="divide-y divide-neutral-100">{items.map(i => <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
    <Pill value={i.priority === "High" ? "FAILED" : i.priority === "Medium" ? "PENDING" : i.priority === "Info" ? "CONFIRMED" : "INACTIVE"} label={i.priority} />
    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold">{i.title}</p>{i.detail && <p className="text-xs text-neutral-500">{i.detail}</p>}</div>
    <span className="text-[11px] text-neutral-400">{i.source}</span>
    {i.href && <Link href={i.href} className="rg-outline">Review</Link>}
  </li>)}</ul>;
}

function RankBars({ rows }: { rows: { name: string; bookings: number; value: number }[] }) {
  if (!rows.length) return <Empty title="No data for this period" />;
  const max = Math.max(...rows.map(r => r.bookings), 1);
  return <ul className="divide-y divide-neutral-100">{rows.map(r => <li key={r.name} className="px-5 py-2.5"><div className="flex items-center justify-between gap-3 text-[13px]"><span className="truncate font-medium" title={r.name}>{r.name}</span><span className="shrink-0 text-xs text-neutral-500">{num(r.bookings)} · {inr(r.value)}</span></div><div className="mt-1.5 h-1.5 rounded-full bg-neutral-100"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(r.bookings / max) * 100}%` }} /></div></li>)}</ul>;
}

export default function AIPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [days, setDays] = useState(30);
  const dash = useAdminData<Dashboard>("/api/admin/dashboard");
  const stats = useAdminData<Analytics>(`/api/admin/analytics?days=${days}`);
  const ai = useAdminData<AiView>("/api/admin/platform?view=ai");
  const auto = useAdminData<AutoView>(tab === "automation" || tab === "overview" ? "/api/admin/platform?view=automation" : null);
  const insights = useMemo(() => buildInsights(dash.data, stats.data), [dash.data, stats.data]);
  const a = stats.data, d = dash.data, rules = auto.data?.rules ?? [];
  const hasTrend = !!a?.series.some(x => x.bookings);
  const actionable = insights.filter(i => i.priority === "High" || i.priority === "Medium");
  const runs30 = rules.reduce((s, r) => s + r.executed30d, 0), failed30 = rules.reduce((s, r) => s + r.failed30d, 0);
  const activeRules = rules.filter(r => r.status === "ACTIVE").length;
  const pendingRetry = auto.data?.retry.find(r => r.status === "PENDING")?.count ?? 0;
  const reload = () => { void dash.reload(); void stats.reload(); void ai.reload(); void auto.reload(); };
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="AI Intelligence Hub" description="Insights, demand history and automation built on your real platform data. Rule-based features are labelled as rules, not AI.">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live data</span>
      {ai.data && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${ai.data.textAi.configured ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-600"}`}><Bot size={13} />{ai.data.textAi.configured ? `Text AI · ${ai.data.textAi.provider}` : "AI provider not configured"}</span>}
      <label className="relative"><span className="sr-only">Period</span><select className="rg-input !w-auto appearance-none !pr-8 font-medium" value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 30, 90, 180, 365].map(v => <option key={v} value={v}>Last {v} days</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500" /></label>
      <button className="rg-secondary" onClick={reload}>Refresh</button>
    </PageHeading>
    <div role="tablist" aria-label="AI Intelligence sections" className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1">
      {TABS.map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition ${tab === v ? "bg-red-600 !text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100"}`}>{l}</button>)}
    </div>

    {tab === "overview" && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Sparkles} accent="violet" label="Active signals" value={num(insights.length)} hint="Rules currently firing" />
        <Kpi icon={ListChecks} accent="red" label="Needs action" value={num(actionable.length)} tone={actionable.length ? "warn" : "good"} hint="High and medium priority" />
        <Kpi icon={Workflow} accent="blue" label="Automation rules active" value={auto.data ? num(activeRules) : "—"} hint={auto.data ? `${num(runs30)} runs in 30 days` : auto.error ? "Super Admin only" : "Loading…"} href="/automation" />
        <Kpi icon={Activity} accent="amber" label="Failed automation events" value={auto.data ? num(auto.data.failed.length) : "—"} tone={auto.data?.failed.length ? "bad" : undefined} hint={auto.data ? `${num(pendingRetry)} queued for retry` : undefined} href="/automation" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <InsightsHero insights={insights} loading={dash.loading || stats.loading} limit={5} cta={false} />
        <Section title="Recommended actions" description="Open the screen where each item can be resolved. Nothing is applied automatically.">
          <InsightList items={actionable.slice(0, 7)} />
        </Section>
      </div>
      <Section title="Demand history" description={`Daily bookings, last ${days} days — what happened, not a forecast`}>
        {a && hasTrend ? <div className="h-64 p-4" role="img" aria-label="Daily bookings, retail and corporate"><ResponsiveContainer width="100%" height="100%"><BarChart data={a.series}>
          <CartesianGrid vertical={false} stroke={chart.grid} /><XAxis dataKey="day" tick={chart.axis} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} minTickGap={18} /><YAxis allowDecimals={false} tick={chart.axis} tickLine={false} axisLine={false} width={30} />
          <Tooltip {...chart.tooltip} /><Legend wrapperStyle={chart.legend} />
          <Bar dataKey="retail" name="Retail" stackId="b" fill={chart.red} maxBarSize={14} /><Bar dataKey="corporate" name="Corporate" stackId="b" fill={chart.blue} radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart></ResponsiveContainer></div> : <Empty title={stats.error ? "Demand history unavailable" : "No bookings in this period"} text={stats.error ? "Booking analytics are available to Super Admin and Finance accounts." : undefined} />}
      </Section>
    </>}

    {tab === "insights" && <Section title="Smart insights" description="Every item is a deterministic rule on live dashboard and analytics values. Priority reflects urgency; sources are listed.">
      <DataState loading={dash.loading && !d} error={dash.error} onRetry={dash.reload}><InsightList items={insights} /></DataState>
    </Section>}

    {tab === "demand" && <DataState loading={stats.loading && !a} error={stats.error} onRetry={stats.reload}>{a && <>
      <Notice>Demand forecasting is not available. This view shows real booking history so you can spot patterns yourself; no predicted values are shown.</Notice>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Top routes" description={`Last ${a.period.days} days`}><RankBars rows={a.routes.map(r => ({ name: r.route, bookings: r.bookings, value: r.value }))} /></Section>
        <Section title="Service types"><RankBars rows={a.services.map(s => ({ name: words(s.service), bookings: s.bookings, value: s.value }))} /></Section>
        <Section title="Vehicle categories"><RankBars rows={a.categories.map(c => ({ name: words(c.category), bookings: c.bookings, value: c.value }))} /></Section>
        <Section title="Top vendors"><RankBars rows={a.topVendors.map(v => ({ name: v.name, bookings: v.bookings, value: v.value }))} /></Section>
      </div>
    </>}</DataState>}

    {tab === "fleet" && <DataState loading={dash.loading && !d} error={dash.error} onRetry={dash.reload}>{d && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={CarFront} accent="blue" label="Active vehicles" value={num(d.people.activeVehicles)} href="/vehicles" />
        <Kpi icon={ShieldCheck} accent="green" label="Marketplace-ready" value={num(d.marketplace.bookableVehicles)} hint={d.marketplace.activeVehicles ? `${Math.round((d.marketplace.bookableVehicles / d.marketplace.activeVehicles) * 100)}% of active vehicles` : undefined} tone={d.marketplace.bookableVehicles === 0 && d.marketplace.activeVehicles > 0 ? "bad" : undefined} href="/vehicles" />
        <Kpi icon={UserRound} accent="amber" label="Active drivers" value={num(d.people.activeDrivers)} href="/drivers" />
        <Kpi icon={Building2} accent="violet" label="Active vendors" value={num(d.people.activeVendors)} hint={`${num(d.people.verifiedVendors)} verified`} href="/vendors" />
        <Kpi icon={Building2} accent="red" label="Awaiting verification" value={num(d.people.pendingVendors)} tone={d.people.pendingVendors ? "warn" : undefined} href="/vendors?status=PENDING" />
      </div>
      <Section title="Supply readiness" description="A vehicle is marketplace-ready when it is verified and available, with an active vendor, an active driver and active pricing."><div className="space-y-3 px-5 py-4 text-[13px]">
        <p>{num(d.marketplace.bookableVehicles)} of {num(d.marketplace.activeVehicles)} active vehicles can currently be booked by customers.</p>
        <div className="h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${d.marketplace.activeVehicles ? (d.marketplace.bookableVehicles / d.marketplace.activeVehicles) * 100 : 0}%` }} /></div>
        <p className="text-xs text-neutral-500">Use Vehicles to see why a vehicle is not bookable (verification, driver, pricing).</p>
      </div></Section>
    </>}</DataState>}

    {tab === "automation" && <DataState loading={auto.loading && !auto.data} error={auto.error} onRetry={auto.reload}>{auto.data && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Workflow} accent="green" label="Active rules" value={num(activeRules)} hint={`${num(rules.length)} rules in total`} />
        <Kpi icon={Activity} accent="blue" label="Runs (30 days)" value={num(runs30)} />
        <Kpi icon={Activity} accent="red" label="Failed runs (30 days)" value={num(failed30)} tone={failed30 ? "bad" : undefined} />
        <Kpi icon={Activity} accent="amber" label="Retry queue" value={num(pendingRetry)} hint="Pending retries" tone={pendingRetry ? "warn" : undefined} />
      </div>
      <Section title="Automation rules" description="Rules run by the existing event pipeline. Manage them on the Automation page." actions={<Link href="/automation" className="rg-primary !py-1.5 !text-xs">Manage automation</Link>}>
        <div className="overflow-x-auto"><table className="rg-table min-w-[700px]"><thead><tr><th>Rule</th><th>Trigger</th><th>Channel</th><th>Status</th><th className="text-right">30-day runs</th><th>Last run</th></tr></thead><tbody>{rules.map(r => <tr key={r.id}><td className="font-medium">{r.name}</td><td className="text-xs">{words(r.trigger)}</td><td className="text-xs">{r.channel}</td><td><Pill value={r.status} /></td><td className="text-right text-xs">{r.requires ? "—" : `${num(r.executed30d)}${r.failed30d ? ` · ${num(r.failed30d)} failed` : ""}`}</td><td className="whitespace-nowrap text-xs">{when(r.lastRunAt)}</td></tr>)}</tbody></table></div>
      </Section>
    </>}</DataState>}

    {tab === "providers" && <DataState loading={ai.loading && !ai.data} error={ai.error} onRetry={ai.reload}>{ai.data && <>
      {!ai.data.textAi.configured && !ai.data.imageAi.configured && <Notice>AI services not configured. No AI provider credentials are set, so no AI features are running.</Notice>}
      <Section title="Providers"><ul className="divide-y divide-neutral-100 text-[13px]">
        <li className="flex items-center justify-between px-5 py-3"><span>Text AI {ai.data.textAi.configured ? `· ${ai.data.textAi.provider}${ai.data.textAi.model ? ` · ${ai.data.textAi.model}` : ""}` : ""}</span><Pill value={ai.data.textAi.configured ? "ACTIVE" : "NOT_CONFIGURED"} label={ai.data.textAi.configured ? "Configured" : "Not configured"} /></li>
        <li className="flex items-center justify-between px-5 py-3"><span>Image generation</span><Pill value={ai.data.imageAi.configured ? "ACTIVE" : "NOT_CONFIGURED"} label={ai.data.imageAi.configured ? "Configured" : "Not configured"} /></li>
      </ul></Section>
      <Section title="Capabilities"><div className="overflow-x-auto"><table className="rg-table min-w-[640px]"><thead><tr><th>Capability</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead><tbody>{ai.data.capabilities.map(c => <tr key={c.name}><td className="font-medium">{c.name}</td><td>{c.kind === "AI" ? "AI" : "Rules (deterministic)"}</td><td><Pill value={c.status} label={c.status === "ACTIVE" ? "Active" : "Not configured"} /></td><td className="text-xs text-neutral-500">{c.note}</td></tr>)}</tbody></table></div></Section>
    </>}</DataState>}
  </div></DashboardLayout>;
}
