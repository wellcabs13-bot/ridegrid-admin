"use client";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Kpi, Pill, Section, Empty, inr, num, when } from "@/components/admin/kit";
import { RefreshCw } from "lucide-react";

type Dashboard = {
  generatedAt: string;
  bookings: { today: number; upcoming: number; upcoming24hNoDriver: number; thisMonth: number; completedThisMonth: number; cancelledThisMonth: number };
  revenue: { today: number; thisMonth: number; gstThisMonth: number; platformFeeThisMonth: number; snapshotComplete: boolean; collectedThisMonth: number; failedPaymentsThisMonth: number; unpaidAmount: number; unpaidCount: number; corporateOutstanding: number; refundsDueAmount: number; refundsDueCount: number };
  people: { activeCustomers: number; corporateTravellers: number; activeVendors: number; verifiedVendors: number; pendingVendors: number; suspendedVendors: number; activeVehicles: number; activeDrivers: number; activeCorporates: number };
  attention: { pendingApprovals: number; pendingBookings: number; staleHolds: number; upcoming24hNoDriver: number; refundsDue: number; openTickets: number; failedPayments: number };
  marketplace: { bookableVehicles: number; activeVehicles: number };
  recent: { id: string; bookingNumber: string; status: string; pickupLocation: string; dropLocation: string; pickupDateTime: string; total: number; customer: string; company: string | null }[];
};

export default function Home() {
  const { data, loading, error, reload } = useAdminData<Dashboard>("/api/admin/dashboard");
  const attention = data ? [
    { label: "Corporate approvals waiting", value: data.attention.pendingApprovals, href: "/corporate" },
    { label: "Upcoming in 24h without driver", value: data.attention.upcoming24hNoDriver, href: "/bookings?status=CONFIRMED" },
    { label: "Refunds due", value: data.attention.refundsDue, href: "/finance?tab=refunds" },
    { label: "Failed payments (month)", value: data.attention.failedPayments, href: "/finance?paymentStatus=FAILED" },
    { label: "Expired payment holds", value: data.attention.staleHolds, href: "/bookings?status=AWAITING_PAYMENT" },
    { label: "Vendors awaiting verification", value: data.people.pendingVendors, href: "/vendors?status=PENDING" },
    { label: "Open support tickets", value: data.attention.openTickets, href: "/support" },
  ] : [];
  const needs = attention.filter(a => a.value > 0);
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-6">
    <PageHeading title="Operations overview" description="Live business status from central bookings, payments, corporate credit and fleet records. Month figures are for the current IST calendar month.">
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button>
      <Link href="/marketplace" className="rg-primary">New booking</Link>
    </PageHeading>
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Bookings today" value={num(data.bookings.today)} href="/bookings?dateField=created" />
        <Kpi label="Upcoming trips" value={num(data.bookings.upcoming)} hint="Confirmed, pickup ahead" href="/bookings?status=CONFIRMED" />
        <Kpi label="Bookings this month" value={num(data.bookings.thisMonth)} hint="Confirmed or later" href="/bookings?dateField=created" />
        <Kpi label="Completed this month" value={num(data.bookings.completedThisMonth)} href="/bookings?status=TRIP_COMPLETED" />
        <Kpi label="Cancelled this month" value={num(data.bookings.cancelledThisMonth)} href="/bookings?status=CANCELLED" />
        <Kpi label="Marketplace ready" value={`${num(data.marketplace.bookableVehicles)} / ${num(data.marketplace.activeVehicles)}`} hint="Bookable / active vehicles" href="/vehicles" tone={data.marketplace.bookableVehicles === 0 ? "bad" : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Booking value today" value={inr(data.revenue.today)} href="/finance" />
        <Kpi label="Booking value this month" value={inr(data.revenue.thisMonth)} hint={`GST ${inr(data.revenue.gstThisMonth)}`} href="/finance" />
        <Kpi label="Platform fee this month" value={inr(data.revenue.platformFeeThisMonth)} hint={data.revenue.snapshotComplete ? "From pricing snapshots" : "Some bookings lack a snapshot"} href="/finance" />
        <Kpi label="Collected this month" value={inr(data.revenue.collectedThisMonth)} hint="Paid transactions" href="/finance" tone="good" />
        <Kpi label="Unpaid / pending" value={inr(data.revenue.unpaidAmount)} hint={`${num(data.revenue.unpaidCount)} open payment(s)`} href="/finance?paymentStatus=PENDING" tone={data.revenue.unpaidCount ? "warn" : undefined} />
        <Kpi label="Corporate outstanding" value={inr(data.revenue.corporateOutstanding)} hint="Corporate credit used" href="/corporate" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Needs attention" description="Only items that currently need action">
          {needs.length ? <ul className="divide-y divide-slate-200">{needs.map(a => <li key={a.label}><Link href={a.href} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-neutral-50"><span>{a.label}</span><span className="font-semibold text-amber-700">{num(a.value)} →</span></Link></li>)}</ul> : <Empty title="All clear" text="No approvals, refunds, failed payments or unassigned trips need attention right now." />}
        </Section>
        <Section title="Network" description="Active accounts and fleet">
          <div className="grid grid-cols-2 gap-px bg-neutral-100">{([
            ["Retail customers", data.people.activeCustomers, "/customers?type=RETAIL"], ["Corporate travellers", data.people.corporateTravellers, "/customers?type=CORPORATE"],
            ["Active corporates", data.people.activeCorporates, "/corporate"], ["Active vendors", data.people.activeVendors, "/vendors"],
            ["Verified vendors", data.people.verifiedVendors, "/vendors?status=VERIFIED"], ["Suspended vendors", data.people.suspendedVendors, "/vendors?status=SUSPENDED"],
            ["Active vehicles", data.people.activeVehicles, "/vehicles"], ["Active drivers", data.people.activeDrivers, "/drivers"],
          ] as [string, number, string][]).map(([label, value, href]) => <Link key={label} href={href} className="bg-white px-5 py-3 hover:bg-neutral-50"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-lg font-semibold">{num(value)}</p></Link>)}</div>
        </Section>
        <Section title="Recent bookings" actions={<Link href="/bookings" className="text-sm font-semibold text-red-700">View all</Link>}>
          {data.recent.length ? <ul className="divide-y divide-slate-200">{data.recent.map(b => <li key={b.id}><Link href={`/bookings?q=${encodeURIComponent(b.bookingNumber)}`} className="block px-5 py-3 hover:bg-neutral-50"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-red-700">{b.bookingNumber}</span><Pill value={b.status} /></div><p className="mt-1 truncate text-xs text-neutral-500">{b.company ? `${b.company} · ` : ""}{b.customer} · {when(b.pickupDateTime)}</p><p className="truncate text-xs text-neutral-500">{b.pickupLocation} → {b.dropLocation} · {inr(b.total)}</p></Link></li>)}</ul> : <Empty title="No bookings yet" text="New retail and corporate bookings appear here as soon as they are created." />}
        </Section>
      </div>
      <p className="text-xs text-neutral-500">Updated {when(data.generatedAt)}. Booking value = confirmed-or-later bookings created in the period (incl. GST). Collected = paid transactions.</p>
    </>}</DataState>
  </div></DashboardLayout>;
}
