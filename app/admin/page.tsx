"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Empty, Kpi, Pill, Section, inr, inrCompact, num, when, words } from "@/components/admin/kit";
import InsightsHero from "@/components/admin/InsightsHero";
import { chart } from "@/components/admin/chart-theme";
import { buildInsights } from "@/lib/admin/insights";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, CalendarCheck, CarFront, ChevronDown, Briefcase, IndianRupee, Radar, RefreshCw, Settings2, Sparkles, UserRound, BadgeIndianRupee, BarChart3, Zap, type LucideIcon } from "lucide-react";

type Dashboard = {
  generatedAt: string;
  bookings: { today: number; upcoming: number; upcoming24hNoDriver: number; thisMonth: number; completedThisMonth: number; cancelledThisMonth: number };
  revenue: { today: number; thisMonth: number; gstThisMonth: number; platformFeeThisMonth: number; snapshotComplete: boolean; collectedThisMonth: number; failedPaymentsThisMonth: number; unpaidAmount: number; unpaidCount: number; corporateOutstanding: number; refundsDueAmount: number; refundsDueCount: number };
  people: { activeCustomers: number; corporateTravellers: number; activeVendors: number; verifiedVendors: number; pendingVendors: number; suspendedVendors: number; activeVehicles: number; activeDrivers: number; activeCorporates: number };
  attention: { pendingApprovals: number; pendingBookings: number; staleHolds: number; upcoming24hNoDriver: number; refundsDue: number; openTickets: number; failedPayments: number };
  marketplace: { bookableVehicles: number; activeVehicles: number };
  recent: { id: string; bookingNumber: string; status: string; pickupLocation: string; dropLocation: string; pickupDateTime: string; total: number; customer: string; company: string | null }[];
};
type Rank = { bookings: number; value: number };
type Analytics = {
  period: { from: string; to: string; days: number };
  series: { day: string; bookings: number; value: number; cancelled: number; corporate: number; retail: number }[];
  routes: (Rank & { route: string })[]; services: (Rank & { service: string })[];
  topVendors: (Rank & { name: string })[];
  cancellations: { cancelled: number; total: number; rate: number | null };
  payu: { attempts: number; paid: number; failed: number; pending: number; successRate: number | null };
};

const QUICK: { title: string; href: string; icon: LucideIcon; tint: string }[] = [
  { title: "Manage Bookings", href: "/bookings", icon: CalendarCheck, tint: "bg-red-50 text-red-600" },
  { title: "Live Operations", href: "/live-operations", icon: Radar, tint: "bg-emerald-50 text-emerald-600" },
  { title: "Manage Vendors", href: "/vendors", icon: Building2, tint: "bg-violet-50 text-violet-600" },
  { title: "Manage Drivers", href: "/drivers", icon: UserRound, tint: "bg-blue-50 text-blue-600" },
  { title: "Manage Vehicles", href: "/vehicles", icon: CarFront, tint: "bg-sky-50 text-sky-600" },
  { title: "Corporate Clients", href: "/corporate", icon: Briefcase, tint: "bg-indigo-50 text-indigo-600" },
  { title: "Pricing & Packages", href: "/pricing", icon: BadgeIndianRupee, tint: "bg-amber-50 text-amber-600" },
  { title: "View Reports", href: "/reports", icon: BarChart3, tint: "bg-rose-50 text-rose-600" },
  { title: "AI Intelligence", href: "/ai", icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-600" },
  { title: "Platform Settings", href: "/settings", icon: Settings2, tint: "bg-slate-100 text-slate-600" },
];
const compact = (v: number) => `₹${Number(v).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })}`;

function istParts() {
  const ist = new Date(Date.now() + 330 * 60_000);
  const hour = ist.getUTCHours();
  return { hello: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening", date: ist.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) };
}

function Bars({ rows, label }: { rows: { name: string; bookings: number; value: number }[]; label: string }) {
  if (!rows.length) return <Empty title="No data for this period" />;
  const max = Math.max(...rows.map(r => r.bookings), 1);
  return <ul className="divide-y divide-neutral-100">{rows.map(r => <li key={r.name} className="px-5 py-2.5">
    <div className="flex items-center justify-between gap-3 text-[13px]"><span className="truncate font-medium" title={r.name}>{r.name}</span><span className="shrink-0 text-xs text-neutral-500">{num(r.bookings)} {label} · {inr(r.value)}</span></div>
    <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(r.bookings / max) * 100}%` }} /></div>
  </li>)}</ul>;
}

export default function Home() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const dash = useAdminData<Dashboard>("/api/admin/dashboard");
  // Analytics is Super Admin / Finance only; Operations staff simply see the operational view.
  const stats = useAdminData<Analytics>(`/api/admin/analytics?days=${days}`);
  const { hello, date } = istParts();
  const data = dash.data, a = stats.data;
  const insights = useMemo(() => buildInsights(data, a), [data, a]);
  const totals = useMemo(() => ({ bookings: a?.series.reduce((s, d) => s + d.bookings, 0) ?? 0, value: a?.series.reduce((s, d) => s + d.value, 0) ?? 0 }), [a]);
  const hasTrend = !!a?.series.some(d => d.bookings || d.value);
  const attention = data ? [
    { label: "Corporate approvals waiting", value: data.attention.pendingApprovals, href: "/corporate" },
    { label: "Upcoming in 24h without driver", value: data.attention.upcoming24hNoDriver, href: "/bookings?status=CONFIRMED" },
    { label: "Refunds due", value: data.attention.refundsDue, href: "/finance?tab=refunds" },
    { label: "Failed payments (month)", value: data.attention.failedPayments, href: "/finance?paymentStatus=FAILED" },
    { label: "Expired payment holds", value: data.attention.staleHolds, href: "/bookings?status=AWAITING_PAYMENT" },
    { label: "Vendors awaiting verification", value: data.people.pendingVendors, href: "/vendors?status=PENDING" },
    { label: "Open support tickets", value: data.attention.openTickets, href: "/support" },
  ].filter(x => x.value > 0) : [];
  const reload = () => { void dash.reload(); void stats.reload(); };
  const busy = dash.loading || stats.loading;
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title={`${hello}, ${(user?.name || "Super Admin").split(" ")[0]}`} description="Here’s what’s happening with your RideGrid platform today.">
      <span className="hidden text-[13px] font-medium text-neutral-500 md:inline">{date}</span>
      <label className="relative"><span className="sr-only">Period</span>
        <select className="rg-input !w-auto appearance-none !pr-8 font-medium" value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 30, 90, 180, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}</select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500" /></label>
      <button className="rg-secondary" disabled={busy} onClick={reload} aria-label="Refresh dashboard"><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh</button>
      <a href="#quick-actions" className="rg-primary"><Zap size={14} />Quick Actions</a>
    </PageHeading>
    <DataState loading={dash.loading && !data} error={dash.error} onRetry={dash.reload}>{data && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={CalendarCheck} accent="red" label="Bookings" value={a ? num(totals.bookings) : num(data.bookings.thisMonth)} hint={a ? `Confirmed or later · last ${days} days` : "This month · confirmed or later"} href="/bookings?dateField=created" />
        <Kpi icon={IndianRupee} accent="green" label="Booking value" value={<span title={inr(a ? totals.value : data.revenue.thisMonth)}>{inrCompact(a ? totals.value : data.revenue.thisMonth)}</span>} hint={a ? `Incl. GST · last ${days} days` : `This month · GST ${inr(data.revenue.gstThisMonth)}`} href="/finance" />
        <Kpi icon={CarFront} accent="blue" label="Active vehicles" value={num(data.people.activeVehicles)} hint={`${num(data.marketplace.bookableVehicles)} marketplace-ready`} tone={data.marketplace.bookableVehicles === 0 && data.marketplace.activeVehicles > 0 ? "bad" : undefined} href="/vehicles" />
        <Kpi icon={UserRound} accent="amber" label="Active drivers" value={num(data.people.activeDrivers)} href="/drivers" />
        <Kpi icon={Building2} accent="violet" label="Active vendors" value={num(data.people.activeVendors)} hint={`${num(data.people.verifiedVendors)} verified`} href="/vendors" />
        <Kpi icon={Briefcase} accent="slate" label="Corporate clients" value={num(data.people.activeCorporates)} hint={`${num(data.people.corporateTravellers)} travellers`} href="/corporate" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <InsightsHero insights={insights} loading={stats.loading} />
        <Section title="Bookings trend" description={a ? `Daily, last ${days} days · bookings (bars) and booking value (line)` : "Daily bookings and value"}
          actions={a && hasTrend ? <div className="flex gap-4 text-right"><div><p className="text-[11px] text-neutral-500">Bookings</p><p className="text-sm font-bold">{num(totals.bookings)}</p></div><div><p className="text-[11px] text-neutral-500">Value</p><p className="text-sm font-bold">{compact(totals.value)}</p></div></div> : undefined}>
          {stats.loading && !a ? <div className="h-[330px] animate-pulse bg-neutral-50" /> : a && hasTrend ? <div className="h-[330px] p-4" role="img" aria-label="Daily bookings and booking value"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={a.series}>
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis dataKey="day" tick={chart.axis} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} minTickGap={18} />
            <YAxis yAxisId="b" allowDecimals={false} tick={chart.axis} tickLine={false} axisLine={false} width={30} />
            <YAxis yAxisId="v" orientation="right" tick={chart.axis} tickLine={false} axisLine={false} width={52} tickFormatter={compact} />
            <Tooltip {...chart.tooltip} formatter={(v, n) => (n === "Booking value" ? [inr(Number(v)), n] : [num(Number(v)), n])} />
            <Legend wrapperStyle={chart.legend} />
            <Bar yAxisId="b" dataKey="bookings" name="Bookings" fill={chart.red} radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Line yAxisId="v" type="monotone" dataKey="value" name="Booking value" stroke={chart.blue} strokeWidth={2} dot={false} />
          </ComposedChart></ResponsiveContainer></div> : <Empty title={stats.error ? "Trend unavailable" : "No bookings in this period"} text={stats.error ? "Booking analytics are available to Super Admin and Finance accounts." : "The chart fills in as confirmed bookings are created."} />}
        </Section>
      </div>
      <section id="quick-actions" aria-label="Quick actions" className="scroll-mt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{QUICK.map(q => { const Icon = q.icon; return <Link key={q.href} href={q.href} className="rg-card group flex flex-col items-center gap-2.5 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${q.tint}`}><Icon size={21} /></span><span className="text-[13px] font-semibold leading-4">{q.title}</span></Link>; })}</div>
      </section>
      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="Needs attention" description="Only items that currently need action">
          {attention.length ? <ul className="divide-y divide-neutral-100">{attention.map(x => <li key={x.label}><Link href={x.href} className="flex items-center justify-between px-5 py-3 text-[13px] hover:bg-neutral-50"><span>{x.label}</span><span className="font-bold text-amber-700">{num(x.value)} →</span></Link></li>)}</ul> : <Empty title="All clear" text="No approvals, refunds, failed payments or unassigned trips need attention right now." />}
        </Section>
        <Section title="Service mix & top routes" description={a ? `Last ${days} days` : undefined}>
          {a ? <div>
            <p className="px-5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Service types</p>
            <Bars label="bookings" rows={a.services.slice(0, 4).map(s => ({ name: words(s.service), bookings: s.bookings, value: s.value }))} />
            <p className="border-t border-neutral-100 px-5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Top routes</p>
            <Bars label="bookings" rows={a.routes.slice(0, 4).map(r => ({ name: r.route, bookings: r.bookings, value: r.value }))} />
          </div> : <Empty title="Analytics unavailable" text="Service and route analytics are available to Super Admin and Finance accounts." />}
        </Section>
        <Section title="Recent bookings" actions={<Link href="/bookings" className="text-xs font-semibold text-red-600">View all</Link>}>
          {data.recent.length ? <ul className="divide-y divide-neutral-100">{data.recent.map(b => <li key={b.id}><Link href={`/bookings?q=${encodeURIComponent(b.bookingNumber)}`} className="block px-5 py-2.5 hover:bg-neutral-50"><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-bold text-red-600">{b.bookingNumber}</span><Pill value={b.status} /></div><p className="mt-0.5 truncate text-xs text-neutral-500">{b.company ? `${b.company} · ` : ""}{b.customer} · {when(b.pickupDateTime)}</p><p className="truncate text-xs text-neutral-500">{b.pickupLocation} → {b.dropLocation} · {inr(b.total)}</p></Link></li>)}</ul> : <Empty title="No bookings yet" text="New retail and corporate bookings appear here as soon as they are created." />}
        </Section>
      </div>
      <Section title="Finance snapshot" description="Current IST calendar month unless stated" actions={<Link href="/finance" className="text-xs font-semibold text-red-600">Open finance</Link>}>
        <div className="grid grid-cols-2 gap-px bg-neutral-100 md:grid-cols-3 xl:grid-cols-6">{([
          ["Booking value today", inr(data.revenue.today), undefined], ["Booking value this month", inr(data.revenue.thisMonth), `GST ${inr(data.revenue.gstThisMonth)}`],
          ["Platform fee this month", inr(data.revenue.platformFeeThisMonth), data.revenue.snapshotComplete ? "From pricing snapshots" : "Some bookings lack a snapshot"],
          ["Collected this month", inr(data.revenue.collectedThisMonth), "Paid transactions"], ["Unpaid / pending", inr(data.revenue.unpaidAmount), `${num(data.revenue.unpaidCount)} open payment(s)`],
          ["Corporate outstanding", inr(data.revenue.corporateOutstanding), "Corporate credit used"],
        ] as [string, string, string | undefined][]).map(([k, v, h]) => <div key={k} className="bg-white px-5 py-3.5"><p className="text-xs text-neutral-500">{k}</p><p className="mt-1 text-lg font-bold tracking-tight">{v}</p>{h && <p className="text-[11px] text-neutral-500">{h}</p>}</div>)}</div>
      </Section>
      <p className="text-xs text-neutral-500">Updated {when(data.generatedAt)}. Booking value = confirmed-or-later bookings created in the period (incl. GST). Collected = paid transactions.</p>
    </>}</DataState>
  </div></DashboardLayout>;
}
