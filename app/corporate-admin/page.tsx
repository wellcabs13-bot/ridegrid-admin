"use client";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, CarFront, Lightbulb, ListChecks, Plus, ReceiptText, RefreshCw, TrendingUp, Users, Wallet } from "lucide-react";
import { ApprovalTable, BookingTable } from "@/components/corporate-admin/tables";
import { Approval, Booking } from "@/components/corporate-admin/types";
import { API, DataState, day, Empty, inr, Kpi, Panel, useAdminData, when } from "@/components/corporate-admin/ui";
import { useAuth } from "@/contexts/AuthContext";

type Finance = { spend: string; billed: string; unbilled: string; unbilledTrips: number; paid: string; outstanding: string; outstandingInvoices: number; due: string; dueInvoices: number; overdue: string; overdueInvoices: number; nextDueDate: string | null };
type Insight = { id: string; tone: "alert" | "warn" | "info" | "good"; title: string; detail: string; href: string };
type Dashboard = {
  company: { companyName: string; status: string };
  employees: { total: number; active: number };
  organisation: { branches: number; departments: number };
  approvals: { pending: number; approved: number; rejected: number; cancelled: number };
  trips: { today: number; upcoming: number; active: number; completed: number; cancelled: number };
  month: { bookings: number; spend: string; start: string; previousSpend: string };
  trend: { month: string; spend: string; bookings: number }[];
  compliance: { windowDays: number; bookings: number; withApproval: number; withinPolicy: number; rejectedRequests: number };
  insights: { items: Insight[]; basis: string };
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

const rs = (v: string | number) => Number(v).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = (n: number) => n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(Math.round(n));
const monthLabel = (v: string) => new Date(v).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" });

// Real monthly spend by pickup month, drawn as bars with a line through the tops.
function SpendTrend({ rows }: { rows: Dashboard["trend"] }) {
  const values = rows.map((r) => Number(r.spend));
  const max = Math.max(...values, 1);
  const W = 520, H = 190, padL = 44, padB = 26, padT = 12, plotH = H - padB - padT, step = (W - padL - 8) / rows.length, bw = Math.min(34, step * 0.5);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const x = (i: number) => padL + step * i + step / 2;
  const ticks = [0, 0.5, 1];
  if (!values.some((v) => v > 0)) return <Empty>No spend recorded in the last six months.</Empty>;
  return <figure className="px-4 pb-3 pt-2">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Travel spend by month: ${rows.map((r, i) => `${monthLabel(r.month)} ${inr(values[i])}`).join(", ")}`} className="h-auto w-full">
      {ticks.map((t) => <g key={t}><line x1={padL} x2={W - 8} y1={y(max * t)} y2={y(max * t)} stroke="#eceff5" strokeDasharray={t ? "3 4" : undefined}/><text x={padL - 8} y={y(max * t) + 4} textAnchor="end" fontSize="10.5" fill="#94a3b8">{compact(max * t)}</text></g>)}
      {rows.map((r, i) => <g key={r.month}><rect x={x(i) - bw / 2} y={y(values[i])} width={bw} height={Math.max(0, padT + plotH - y(values[i]))} rx="5" fill="#e11d2e" opacity={i === rows.length - 1 ? 1 : 0.82}/><text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">{monthLabel(r.month)}</text></g>)}
      <polyline fill="none" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" points={rows.map((_, i) => `${x(i)},${y(values[i])}`).join(" ")}/>
      {rows.map((_, i) => <circle key={i} cx={x(i)} cy={y(values[i])} r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.6"/>)}
    </svg>
    <figcaption className="mt-1 text-[11.5px] text-neutral-500">Spend on non-cancelled bookings by pickup month (India time). Actual figures only.</figcaption>
  </figure>;
}

function Donut({ c }: { c: Dashboard["compliance"] }) {
  const total = c.bookings;
  const R = 52, C = 2 * Math.PI * R;
  const within = total ? c.withinPolicy / total : 0;
  const approved = total ? c.withApproval / total : 0;
  const pct = Math.round(within * 100);
  const seg = (frac: number, offset: number, color: string) => <circle r={R} cx="70" cy="70" fill="none" stroke={color} strokeWidth="14" strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-offset * C} transform="rotate(-90 70 70)"/>;
  return <div className="px-5 pb-5 pt-3">
    {total === 0 ? <Empty>No bookings in the last {c.windowDays} days.</Empty> : <>
      <div className="relative mx-auto h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" role="img" aria-label={`${pct}% of bookings were within policy`} className="h-full w-full"><circle r={R} cx="70" cy="70" fill="none" stroke="#eef0f5" strokeWidth="14"/>{seg(within, 0, "#16a34a")}{seg(approved, within, "#d97706")}</svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[26px] font-bold leading-none">{pct}%</span><span className="mt-1 text-[11px] text-neutral-500">within policy</span></div>
      </div>
      <ul className="mt-4 space-y-2 text-[12.5px]">
        <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600"/>Booked within policy</span><b>{c.withinPolicy}</b></li>
        <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-600"/>Booked after approval</span><b>{c.withApproval}</b></li>
        <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-neutral-300"/>Requests rejected</span><b>{c.rejectedRequests}</b></li>
      </ul>
      <p className="mt-3 text-[11.5px] text-neutral-500">Last {c.windowDays} days, from bookings and approval requests.</p>
    </>}
  </div>;
}

const TONE_ICON: Record<Insight["tone"], string> = { alert: "bg-red-50 text-red-600", warn: "bg-amber-50 text-amber-600", info: "bg-sky-50 text-sky-600", good: "bg-emerald-50 text-emerald-600" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function CorporateDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAdminData<Dashboard>(`${API}/dashboard`);
  const hasCredit = !!data?.credit && data.credit.creditLimit > 0;
  const first = (user?.name ?? "").trim().split(/\s+/)[0];
  const prev = data ? Number(data.month.previousSpend) : 0, cur = data ? Number(data.month.spend) : 0;
  const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">{greeting()}{first ? `, ${first}` : ""}!</h1>
        <p className="mt-1 text-[13.5px] text-neutral-500">Here&apos;s what&apos;s happening with {data ? `${data.company.companyName}'s` : "your company's"} corporate travel today.</p>
      </div>
      <div className="flex gap-2">
        <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
        <Link href="/corporate-admin/bookings/new" className="rg-primary"><Plus size={16}/>New booking</Link>
      </div>
    </div>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Trips in progress" value={data.trips.active} icon={CarFront} accent="red" href="/corporate-admin/bookings?view=ongoing" hint={`${data.trips.today} today · ${data.trips.upcoming} upcoming`}/>
        <Kpi label="Travel spend this month" value={rs(data.month.spend)} icon={ReceiptText} accent="blue" href="/corporate-admin/reports" trend={delta === null ? undefined : { text: `${Math.abs(delta)}% vs last month`, direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down", good: false }} hint={`${data.month.bookings} booking(s) since ${day(data.month.start)}`}/>
        <Kpi label="Active employees" value={data.employees.active} icon={Users} accent="violet" href="/corporate-admin/employees" hint={`${data.employees.total} on record`}/>
        <Kpi label="Approvals pending" value={data.approvals.pending} icon={ListChecks} accent="amber" tone={data.approvals.pending ? "alert" : undefined} href="/corporate-admin/approvals?status=PENDING" hint={`${data.approvals.approved} approved · ${data.approvals.rejected} rejected`}/>
        <Kpi label="Available credit" value={hasCredit ? rs(data.credit!.available) : "—"} icon={Wallet} accent="green" tone={hasCredit && data.credit!.available <= 0 ? "alert" : undefined} href="/corporate-admin/billing" hint={hasCredit ? `of ${inr(data.credit!.creditLimit)} limit` : "Credit not configured"}/>
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="Travel spend trend" description="Last six months"><SpendTrend rows={data.trend}/></Panel>
        <Panel className="xl:col-span-3" title="Policy compliance"><Donut c={data.compliance}/></Panel>
        <section className="rg-card rgc-ai xl:col-span-4" aria-label="Insights">
          <div className="flex items-center justify-between gap-3 border-b border-violet-100 px-5 py-3.5"><h2 className="flex items-center gap-2 text-[15px] font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Lightbulb size={15}/></span>Travel insights</h2><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-bold text-violet-700">Rule-based</span></div>
          {data.insights.items.length ? <ul className="divide-y divide-violet-50">{data.insights.items.map((i) => <li key={i.id}><Link href={i.href} className="flex gap-3 px-5 py-3 transition hover:bg-violet-50/50"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_ICON[i.tone]}`}>{i.tone === "alert" || i.tone === "warn" ? <AlertTriangle size={15}/> : i.tone === "good" ? <TrendingUp size={15}/> : <Activity size={15}/>}</span><span className="min-w-0"><span className="block text-[13px] font-semibold leading-snug">{i.title}</span><span className="mt-0.5 block text-[12px] leading-snug text-neutral-500">{i.detail}</span></span></Link></li>)}</ul> : <Empty>Nothing needs your attention right now.</Empty>}
          <p className="border-t border-violet-50 px-5 py-2.5 text-[11px] text-neutral-500">{data.insights.basis}</p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="Travel requests & approvals" description="Oldest first. Decide before the pickup time passes." action={<Link href="/corporate-admin/approvals" className="inline-flex items-center gap-1 text-[13px] font-semibold text-red-600">View all<ArrowRight size={14}/></Link>}>
          <ApprovalTable compact rows={data.pendingApprovals} empty="No requests are waiting for a decision."/>
        </Panel>
        <div className="space-y-5 xl:col-span-5">
          <Panel title="Corporate credit" action={<Link href="/corporate-admin/billing" className="text-[13px] font-semibold text-red-600">Billing</Link>}>
            {hasCredit ? <div className="p-5">
              <div className="flex items-baseline justify-between text-sm"><span className="text-neutral-500">Available</span><span className="text-[20px] font-bold">{inr(data.credit!.available)}</span></div>
              <Meter used={data.credit!.outstanding} limit={data.credit!.creditLimit}/>
              <p className="mt-2 text-xs text-neutral-500">{inr(data.credit!.outstanding)} used of {inr(data.credit!.creditLimit)} limit</p>
            </div> : <Empty>No corporate credit limit is configured, so bookings cannot be confirmed yet. Rides are paid only by corporate credit — contact RideGrid to set a limit.</Empty>}
          </Panel>
          <Panel title="Budget usage" action={<Link href="/corporate-admin/budgets" className="text-[13px] font-semibold text-red-600">Budgets</Link>}>
            {data.budgets.length ? <ul className="divide-y divide-neutral-100">{data.budgets.map((b) => <li key={b.id} className="px-5 py-3">
              <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{b.name}</span><span className="whitespace-nowrap text-neutral-500">{inr(b.bookedSpend)} / {inr(b.limit)}</span></div>
              <Meter used={Number(b.bookedSpend)} limit={Number(b.limit)}/>
              <p className="mt-1 text-xs text-neutral-500">{b.scope === "COMPANY" ? "Company" : `${b.scope.toLowerCase()} · ${b.scopeName}`} · {b.period.toLowerCase().replaceAll("_", " ")} · ends {day(b.endDate)}</p>
            </li>)}</ul> : <Empty>No budget covers today.</Empty>}
          </Panel>
        </div>
      </div>

      <Panel title="Billing snapshot" description="From invoices issued by RideGrid Finance. Unbilled is completed trips not yet invoiced." action={<Link href="/corporate-admin/invoices" className="text-[13px] font-semibold text-red-600">Invoices</Link>}>
        <dl className="grid grid-cols-2 gap-px bg-neutral-100 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Billed", inr(data.billing.billed), `/corporate-admin/invoices`],
            ["Unbilled", inr(data.billing.unbilled), undefined, `${data.billing.unbilledTrips} trip(s)`],
            ["Paid", inr(data.billing.paid), `/corporate-admin/invoices?status=PAID`],
            ["Outstanding", inr(data.billing.outstanding), `/corporate-admin/invoices?status=PENDING`, `${data.billing.outstandingInvoices} unpaid`],
            ["Due now", String(data.billing.dueInvoices + data.billing.overdueInvoices), `/corporate-admin/invoices?status=OVERDUE`, data.billing.overdueInvoices ? `${data.billing.overdueInvoices} overdue · ${inr(data.billing.overdue)}` : data.billing.nextDueDate ? `Next ${day(data.billing.nextDueDate)}` : "Nothing due"],
            ["Branches / departments", `${data.organisation.branches} / ${data.organisation.departments}`, `/corporate-admin/departments`],
          ].map(([k, v, href, hint]) => {
            const body = <><dt className="text-[12px] font-medium text-neutral-500">{k}</dt><dd className="mt-1 text-[17px] font-bold tabular-nums">{v}</dd>{hint && <p className="mt-0.5 text-[11.5px] text-neutral-500">{hint}</p>}</>;
            return href ? <Link key={k} href={href} className="bg-white p-4 transition hover:bg-neutral-50">{body}</Link> : <div key={k} className="bg-white p-4">{body}</div>;
          })}
        </dl>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Trips in progress" description="Driver App status from the central trip record.">
          <BookingTable rows={data.active} empty="No trips are in progress right now."/>
        </Panel>
        <Panel title="Upcoming trips" action={<Link href="/corporate-admin/bookings?view=upcoming" className="text-[13px] font-semibold text-red-600">All bookings</Link>}>
          <BookingTable rows={data.upcoming} empty="No upcoming trips."/>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Recent bookings"><BookingTable rows={data.recent} empty="No rides have been booked yet."/></Panel>
        <Panel title="Recent activity">
          {data.activity.length ? <ul className="divide-y divide-neutral-100">{data.activity.map((a, i) => <li key={i}><Link href={a.href} className="block px-5 py-3 text-[13px] hover:bg-neutral-50"><p>{a.text}</p><p className="mt-0.5 text-xs text-neutral-500">{when(a.at)}</p></Link></li>)}</ul> : <Empty>No recent activity.</Empty>}
        </Panel>
      </div>
      <p className="text-xs text-neutral-500">As of {when(data.asOf)} (India time). Spend counts non-cancelled bookings by pickup date.{data.unreadNotifications ? ` · ${data.unreadNotifications} unread notification(s).` : ""}</p>
    </>}</DataState>
  </>;
}
