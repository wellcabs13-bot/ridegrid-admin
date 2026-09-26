"use client";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading, DataState, Metric, Badge, useAdminData, label, date } from "@/components/admin/Primitives";
import { ArrowUpRight, RefreshCw } from "lucide-react";

type Dashboard = {
  counts: { customers: number; vendors: number; drivers: number; vehicles: number; corporates: number; pendingVendors: number };
  bookingStatuses: { status: string; count: number }[];
  supportStatuses: { status: string; count: number }[];
  recentBookings: { id: string; bookingNumber: string; status: string; pickupLocation: string; dropLocation: string; pickupDateTime: string; bookingSource: string; customer: { firstName: string; lastName: string } }[];
  fetchedAt: string;
};
export default function Home() {
  const {data, loading, error, reload} = useAdminData<Dashboard>("/api/admin/dashboard");
  const count = (status: string) => data?.bookingStatuses.find(item=>item.status===status)?.count ?? 0;
  const total = data?.bookingStatuses.reduce((sum,item)=>sum+item.count,0) ?? 0;
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-6">
    <PageHeading title="Command center" description="A clear view of your bookings, fleet and operational workload."><button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button></PageHeading>
    <section className="relative overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white md:p-8">
      <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-red-600/15 blur-3xl"/>
      <p className="relative text-[10px] font-semibold uppercase tracking-[.2em] text-red-400">Your mobility workspace</p>
      <h2 className="relative mt-3 text-2xl font-semibold">Keep every journey moving.</h2>
      <p className="relative mt-3 max-w-xl text-sm leading-6 text-neutral-400">Review bookings, manage your partners and resolve the work that needs attention.</p>
      <div className="relative mt-6 flex flex-wrap gap-3"><Link href="/marketplace" className="rg-primary">Create a booking <ArrowUpRight size={16}/></Link><Link href="/bookings" className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-medium">Manage bookings</Link></div>
    </section>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total bookings" value={total}/><Metric label="Trips in progress" value={count("TRIP_STARTED")}/><Metric label="Completed trips" value={count("TRIP_COMPLETED")}/><Metric label="Cancelled bookings" value={count("CANCELLED")}/></div>
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-5">{(["customers","vendors","drivers","vehicles","corporates"] as const).map(key=><Metric key={key} label={key[0].toUpperCase()+key.slice(1)} value={data.counts[key]}/>)}</div>
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rg-card xl:col-span-2"><div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-5"><div><h2 className="font-semibold">Recent bookings</h2><p className="mt-1 text-xs text-neutral-500">Latest eight records by creation time</p></div><Link href="/bookings" className="text-sm font-semibold text-red-700">View all</Link></div>
          {!data.recentBookings.length ? <p className="p-10 text-center text-sm text-neutral-500">No bookings yet. New journeys will appear here once created.</p> : <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Booking / Customer</th><th>Journey</th><th>Status</th></tr></thead><tbody>{data.recentBookings.map(b=><tr key={b.id}><td><Link className="font-semibold text-red-700" href={`/bookings?search=${encodeURIComponent(b.bookingNumber)}`}>{b.bookingNumber}</Link><p className="mt-1 text-xs text-neutral-500">{b.customer.firstName} {b.customer.lastName}</p></td><td><p className="max-w-xs">{b.pickupLocation} → {b.dropLocation}</p><p className="mt-1 text-xs text-neutral-500">{date(b.pickupDateTime)}</p></td><td><Badge>{label(b.status)}</Badge></td></tr>)}</tbody></table></div>}
        </section>
        <div className="space-y-6"><section className="rg-card p-5"><h2 className="font-semibold">Needs attention</h2><div className="mt-4 divide-y divide-neutral-100">{[{label:"Pending bookings",value:count("PENDING"),href:"/bookings"},{label:"Vendor approvals",value:data.counts.pendingVendors,href:"/vendors"}].map(item=><Link key={item.label} href={item.href} className="flex items-center justify-between py-3 text-sm"><span className="text-neutral-600">{item.label}</span><span className="font-semibold">{item.value} ↗</span></Link>)}</div></section>
        <section className="rg-card p-5"><h2 className="font-semibold">Booking distribution</h2><div className="mt-4 space-y-4">{!total && <p className="text-sm text-neutral-500">No booking history to chart yet.</p>}{data.bookingStatuses.map(item=><div key={item.status}><div className="mb-2 flex justify-between gap-2 text-xs"><span className="text-neutral-500">{label(item.status)}</span><span className="font-semibold">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-red-600" style={{width:`${total ? item.count/total*100 : 0}%`}}/></div></div>)}</div></section></div>
      </div>
      <section className="rg-card p-5"><div className="flex justify-between"><h2 className="font-semibold">Support workload</h2><Link href="/support" className="text-sm font-semibold text-red-700">Open support</Link></div><div className="mt-4 flex flex-wrap gap-3">{data.supportStatuses.length ? data.supportStatuses.map(s=><Badge key={s.status}>{label(s.status)} · {s.count}</Badge>) : <p className="text-sm text-neutral-500">No support tickets recorded.</p>}</div></section>
      <p className="text-xs text-neutral-500">Loaded {date(data.fetchedAt)} · Counts exclude archived operational records.</p>
    </>}</DataState>
  </div></DashboardLayout>;
}
