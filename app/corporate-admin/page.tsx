"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { ApprovalTable, BookingTable } from "@/components/corporate-admin/tables";
import { Approval, Booking } from "@/components/corporate-admin/types";
import { API, DataState, day, Empty, inr, Kpi, PageHeader, Panel, useAdminData, when } from "@/components/corporate-admin/ui";

type Finance = { spend: string; billed: string; unbilled: string; unbilledTrips: number; paid: string; outstanding: string; outstandingInvoices: number; due: string; dueInvoices: number; overdue: string; overdueInvoices: number; nextDueDate: string | null };
type Dashboard = {
  company: { companyName: string; status: string };
  employees: { total: number; active: number };
  organisation: { branches: number; departments: number };
  approvals: { pending: number; approved: number; rejected: number; cancelled: number };
  trips: { today: number; upcoming: number; active: number; completed: number; cancelled: number };
  month: { bookings: number; spend: string; start: string };
  budget: { allocated: string; used: string; committed: string; remaining: string; count: number } | null;
  pendingApprovals: Approval[]; upcoming: Booking[]; active: Booking[]; recent: Booking[];
  activity: { at: string; kind: string; text: string; href: string }[];
  credit: { enabled: boolean; creditLimit: number; outstanding: number; available: number } | null;
  budgets: { id: string; name: string; scope: string; scopeName: string; period: string; status: string; limit: string; bookedSpend: string; endDate: string }[];
  billing: Finance;
  unreadNotifications: number; asOf: string;
};

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><div className={`h-full rounded-full ${pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${pct}%` }}/></div>;
}

export default function CorporateDashboard() {
  const { data, loading, error, reload } = useAdminData<Dashboard>(`${API}/dashboard`);
  const hasCredit = !!data?.credit && data.credit.creditLimit > 0;
  return <>
    <PageHeader title={data ? data.company.companyName : "Company travel dashboard"} description="Live view of approvals, bookings, trips, budgets and billing — the same records your employees, RideGrid operations, vendors and drivers work on.">
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <section aria-label="Travel" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Pending approvals" value={data.approvals.pending} href="/corporate-admin/approvals?status=PENDING" tone={data.approvals.pending ? "alert" : undefined} hint={`${data.approvals.approved} approved · ${data.approvals.rejected} rejected`}/>
        <Kpi label="Trips today" value={data.trips.today} href="/corporate-admin/bookings?view=upcoming"/>
        <Kpi label="Upcoming trips" value={data.trips.upcoming} href="/corporate-admin/bookings?view=upcoming"/>
        <Kpi label="Trips in progress" value={data.trips.active} href="/corporate-admin/bookings?view=ongoing"/>
        <Kpi label="Completed trips" value={data.trips.completed} href="/corporate-admin/bookings?view=completed"/>
        <Kpi label="Cancelled trips" value={data.trips.cancelled} href="/corporate-admin/bookings?view=cancelled"/>
      </section>
      <section aria-label="Spend and organisation" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Spend this month" value={inr(data.month.spend)} hint={`${data.month.bookings} booking(s) since ${day(data.month.start)}`}/>
        <Kpi label="Budget used" value={data.budget ? inr(Number(data.budget.used) + Number(data.budget.committed)) : "—"} hint={data.budget ? `of ${inr(data.budget.allocated)} company budget` : "No active company budget"} href="/corporate-admin/budgets"/>
        <Kpi label="Budget remaining" value={data.budget ? inr(data.budget.remaining) : "—"} href="/corporate-admin/budgets"/>
        <Kpi label="Active employees" value={data.employees.active} hint={`${data.employees.total} total`} href="/corporate-admin/employees"/>
        <Kpi label="Branches" value={data.organisation.branches} href="/corporate-admin/branches"/>
        <Kpi label="Departments" value={data.organisation.departments} href="/corporate-admin/departments"/>
      </section>
      <section aria-label="Billing" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Available credit" value={hasCredit ? inr(data.credit!.available) : "—"} tone={hasCredit && data.credit!.available <= 0 ? "alert" : undefined} hint={hasCredit ? `of ${inr(data.credit!.creditLimit)} limit` : "Credit not configured"} href="/corporate-admin/billing"/>
        <Kpi label="Billed" value={inr(data.billing.billed)} href="/corporate-admin/invoices"/>
        <Kpi label="Unbilled" value={inr(data.billing.unbilled)} hint={`${data.billing.unbilledTrips} completed trip(s) awaiting invoice`}/>
        <Kpi label="Paid" value={inr(data.billing.paid)} href="/corporate-admin/invoices?status=PAID"/>
        <Kpi label="Outstanding" value={inr(data.billing.outstanding)} hint={`${data.billing.outstandingInvoices} unpaid invoice(s)`} href="/corporate-admin/invoices?status=PENDING"/>
        <Kpi label="Invoices due" value={data.billing.dueInvoices + data.billing.overdueInvoices} tone={data.billing.overdueInvoices ? "alert" : undefined} hint={data.billing.overdueInvoices ? `${data.billing.overdueInvoices} overdue · ${inr(data.billing.overdue)}` : data.billing.nextDueDate ? `Next due ${day(data.billing.nextDueDate)}` : "Nothing due"} href="/corporate-admin/invoices?status=OVERDUE"/>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Pending approvals" description="Oldest first. Decide before the pickup time passes." action={<Link href="/corporate-admin/approvals" className="text-sm font-semibold text-red-700">All approvals</Link>}>
          <ApprovalTable compact rows={data.pendingApprovals} empty="No requests are waiting for a decision."/>
        </Panel>
        <div className="space-y-6">
          <Panel title="Corporate credit" action={<Link href="/corporate-admin/billing" className="text-sm font-semibold text-red-700">Billing</Link>}>
            {hasCredit ? <div className="p-5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Available</span><span className="font-semibold">{inr(data.credit!.available)}</span></div>
              <Meter used={data.credit!.outstanding} limit={data.credit!.creditLimit}/>
              <p className="mt-2 text-xs text-neutral-500">{inr(data.credit!.outstanding)} used of {inr(data.credit!.creditLimit)} limit</p>
            </div> : <Empty>No corporate credit limit is configured, so employees cannot confirm bookings yet. Corporate rides are paid only by corporate credit — contact RideGrid to set a limit.</Empty>}
          </Panel>
          <Panel title="Budget usage" action={<Link href="/corporate-admin/budgets" className="text-sm font-semibold text-red-700">Budgets</Link>}>
            {data.budgets.length ? <ul className="divide-y divide-neutral-100">{data.budgets.map((b) => <li key={b.id} className="px-5 py-3">
              <div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{b.name}</span><span className="whitespace-nowrap text-neutral-500">{inr(b.bookedSpend)} / {inr(b.limit)}</span></div>
              <Meter used={Number(b.bookedSpend)} limit={Number(b.limit)}/>
              <p className="mt-1 text-xs text-neutral-500">{b.scope === "COMPANY" ? "Company" : `${b.scope.toLowerCase()} · ${b.scopeName}`} · {b.period.toLowerCase().replaceAll("_", " ")} · ends {day(b.endDate)}</p>
            </li>)}</ul> : <Empty>No budget covers today.</Empty>}
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Trips in progress" description="Driver App status from the central trip record.">
          <BookingTable rows={data.active} empty="No trips are in progress right now."/>
        </Panel>
        <Panel title="Upcoming trips" action={<Link href="/corporate-admin/bookings?view=upcoming" className="text-sm font-semibold text-red-700">All bookings</Link>}>
          <BookingTable rows={data.upcoming} empty="No upcoming trips."/>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Recent bookings"><BookingTable rows={data.recent} empty="Your employees have not booked any rides yet."/></Panel>
        <Panel title="Recent activity">
          {data.activity.length ? <ul className="divide-y divide-neutral-100">{data.activity.map((a, i) => <li key={i}><Link href={a.href} className="block px-5 py-3 text-sm hover:bg-neutral-50"><p>{a.text}</p><p className="mt-0.5 text-xs text-neutral-500">{when(a.at)}</p></Link></li>)}</ul> : <Empty>No recent activity.</Empty>}
        </Panel>
      </div>
      <p className="text-xs text-neutral-500">As of {when(data.asOf)} (India time). Spend counts non-cancelled bookings by pickup date. Billed, paid and outstanding come from invoices issued by RideGrid Finance; unbilled is completed trips not yet invoiced.{data.unreadNotifications ? ` · ${data.unreadNotifications} unread notification(s).` : ""}</p>
    </>}</DataState>
  </>;
}
