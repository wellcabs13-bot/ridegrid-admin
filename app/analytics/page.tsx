"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Empty, Kpi, Section, inr, num, words } from "@/components/admin/kit";
import { chart } from "@/components/admin/chart-theme";

type Rank = { bookings: number; value: number };
type Data = {
  period: { from: string; to: string; days: number };
  series: { day: string; bookings: number; value: number; cancelled: number; corporate: number; retail: number }[];
  segments: { retail: Rank; corporate: Rank };
  routes: (Rank & { route: string })[]; services: (Rank & { service: string })[]; categories: (Rank & { category: string })[];
  topVendors: (Rank & { name: string })[]; corporateSpend: (Rank & { name: string })[];
  cancellations: { cancelled: number; total: number; rate: number | null };
  repeat: { customers: number; repeaters: number; rate: number | null };
  payu: { attempts: number; paid: number; failed: number; pending: number; successRate: number | null };
  conversion: null;
};

const RETAIL = chart.red, CORPORATE = chart.blue;
const axis = chart.axis;
const tooltip = chart.tooltip;

function RankTable({ rows, label }: { rows: (Rank & Record<string, unknown>)[]; label: string }) {
  if (!rows.length) return <Empty title="No data for this period" />;
  const max = Math.max(...rows.map(r => r.value), 1);
  return <table className="rg-table"><thead><tr><th>{label}</th><th className="text-right">Bookings</th><th className="text-right">Value</th></tr></thead><tbody>{rows.map((r, i) => {
    const name = String(r.name ?? r.route ?? r.service ?? r.category);
    return <tr key={i}><td><p>{r.service || r.category ? words(name) : name}</p><div className="mt-1 h-1 rounded-full bg-neutral-100"><div className="h-1 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: RETAIL }} /></div></td><td className="text-right">{num(r.bookings)}</td><td className="text-right">{inr(r.value)}</td></tr>;
  })}</tbody></table>;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAdminData<Data>(`/api/admin/analytics?days=${days}`);
  const hasTrend = !!data?.series.some(d => d.bookings || d.cancelled);
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Analytics" description="Trends from real bookings and payments only. Periods with no activity show empty states — nothing is simulated.">
      <select className="rg-input !w-auto" aria-label="Period" value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 30, 90, 180, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}</select>
    </PageHeading>
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Retail bookings" value={num(data.segments.retail.bookings)} hint={inr(data.segments.retail.value)} />
        <Kpi label="Corporate bookings" value={num(data.segments.corporate.bookings)} hint={inr(data.segments.corporate.value)} />
        <Kpi label="Cancellation rate" value={data.cancellations.rate === null ? "—" : `${data.cancellations.rate}%`} hint={`${num(data.cancellations.cancelled)} of ${num(data.cancellations.total)}`} />
        <Kpi label="Repeat customers" value={data.repeat.rate === null ? "—" : `${data.repeat.rate}%`} hint={`${num(data.repeat.repeaters)} of ${num(data.repeat.customers)} booked 2+ times`} />
        <Kpi label="PayU success rate" value={data.payu.successRate === null ? "—" : `${data.payu.successRate}%`} hint={data.payu.attempts ? `${num(data.payu.paid)} paid · ${num(data.payu.failed)} failed · ${num(data.payu.pending)} pending` : "No PayU attempts yet"} />
        <Kpi label="Search → booking conversion" value="Not tracked" hint="Search/visit events are not recorded" />
      </div>
      <Section title="Daily bookings · retail vs corporate" description="Confirmed-or-later bookings by booking date (IST)">
        {hasTrend ? <div className="h-72 p-4" role="img" aria-label="Daily retail and corporate bookings"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.series} barGap={2}>
          <CartesianGrid vertical={false} stroke={chart.grid} /><XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} minTickGap={16} /><YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} width={32} />
          <Tooltip {...tooltip} /><Legend wrapperStyle={chart.legend} />
          <Bar dataKey="retail" name="Retail" stackId="b" fill={RETAIL} /><Bar dataKey="corporate" name="Corporate" stackId="b" fill={CORPORATE} radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <Empty title="No bookings in this period" />}
      </Section>
      <Section title="Daily booking value" description="Sum of booking totals incl. GST">
        {hasTrend ? <div className="h-64 p-4" role="img" aria-label="Daily booking value"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.series}>
          <CartesianGrid vertical={false} stroke={chart.grid} /><XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} minTickGap={16} /><YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={v => `₹${Number(v).toLocaleString("en-IN", { notation: "compact" })}`} />
          <Tooltip {...tooltip} formatter={v => [inr(Number(v)), "Booking value"]} /><Bar dataKey="value" name="Booking value" fill={RETAIL} radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <Empty title="No revenue in this period" />}
      </Section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Top routes"><RankTable rows={data.routes} label="Route" /></Section>
        <Section title="Service types"><RankTable rows={data.services} label="Service" /></Section>
        <Section title="Vehicle categories"><RankTable rows={data.categories} label="Category" /></Section>
        <Section title="Top vendors"><RankTable rows={data.topVendors} label="Vendor" /></Section>
        <Section title="Corporate spend"><RankTable rows={data.corporateSpend} label="Company" /></Section>
      </div>
    </>}</DataState>
  </div></DashboardLayout>;
}
