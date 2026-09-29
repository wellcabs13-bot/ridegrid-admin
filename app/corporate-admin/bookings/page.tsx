"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw, RotateCcw } from "lucide-react";
import { BookingTable } from "@/components/corporate-admin/tables";
import { Booking, OrgOptions, Paged } from "@/components/corporate-admin/types";
import { API, DataState, PageHeader, Pagination, Panel, qs, Tabs, useAdminData, useDebounced } from "@/components/corporate-admin/ui";

type Counts = { requestsPending: number; requestsApproved: number; requestsRejected: number; upcoming: number; ongoing: number; completed: number; cancelled: number; archived: number };
const TRIP = ["ASSIGNED", "ARRIVED_AT_PICKUP", "STARTED", "PASSENGER_ONBOARD", "COMPLETED", "CANCELLED"];
const text = (v: string) => v.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
const VIEWS = ["", "upcoming", "ongoing", "completed", "cancelled", "archived"] as const;
type View = typeof VIEWS[number];

function Bookings() {
  const params = useSearchParams();
  const requested = params.get("view") ?? "";
  const initial = { q: "", from: "", to: "", tripStatus: "", approval: "", service: "", vendorId: "", branchId: "", departmentId: "", paymentStatus: "", employeeId: params.get("employeeId") ?? "", when: params.get("when") ?? "" };
  const [f, setF] = useState(initial);
  const [view, setView] = useState<View>((VIEWS as readonly string[]).includes(requested) ? requested as View : "");
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q);
  const set = (k: keyof typeof initial) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const { data: options } = useAdminData<OrgOptions>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<Paged<Booking> & { vendors: { id: string; companyName: string }[] | null; counts: Counts | null }>(`${API}/bookings${qs({ ...f, q, view, page })}`);
  const [vendors, setVendors] = useState<{ id: string; companyName: string }[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  // Vendor options and tab counts are returned with the first page only.
  useEffect(() => { if (data?.vendors) setVendors(data.vendors); if (data?.counts) setCounts(data.counts); }, [data]);
  const select = (k: keyof typeof initial, label: string, values: [string, string][]) =>
    <select aria-label={label} className="rg-input" value={f[k]} onChange={set(k)}><option value="">{label}: all</option>{values.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>;
  return <>
    <PageHeader title="Company bookings" description="Every RideGrid booking made for your company, read from the central booking record shared with RideGrid operations, vendors and drivers. Corporate rides are paid only by corporate credit.">
      <Link href="/corporate-admin/bookings/new" className="rg-primary"><Plus size={15}/>New booking</Link>
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    {counts && <div className="flex flex-wrap gap-2 text-sm">
      <Link href="/corporate-admin/approvals?status=PENDING" className="rg-card px-4 py-2 hover:border-red-200">Pending requests <strong className="ml-1">{counts.requestsPending}</strong></Link>
      <Link href="/corporate-admin/approvals?status=APPROVED" className="rg-card px-4 py-2 hover:border-red-200">Approved, not yet booked <strong className="ml-1">{counts.requestsApproved}</strong></Link>
      <Link href="/corporate-admin/approvals?status=REJECTED" className="rg-card px-4 py-2 hover:border-red-200">Rejected requests <strong className="ml-1">{counts.requestsRejected}</strong></Link>
    </div>}
    <Panel title="Filters" action={<button className="rg-secondary" onClick={() => { setF({ ...initial, employeeId: "", when: "" }); setPage(1); }}><RotateCcw size={14}/>Reset</button>}>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <input aria-label="Search booking or employee" placeholder="Booking no. or employee…" className="rg-input sm:col-span-2" value={f.q} onChange={set("q")}/>
        <label className="text-xs text-neutral-500">From<input type="date" className="rg-input mt-1" value={f.from} onChange={set("from")}/></label>
        <label className="text-xs text-neutral-500">To<input type="date" className="rg-input mt-1" value={f.to} onChange={set("to")}/></label>
        {select("service", "Service", [["ONE_WAY", "One way"], ["ROUNDTRIP", "Round trip"], ["LOCAL", "Local"], ["AIRPORT", "Airport"]])}
        {select("tripStatus", "Trip status", TRIP.map((s) => [s, text(s)]))}
        {select("approval", "Approval", [["REQUIRED", "Booked after approval"], ["DIRECT", "No approval needed"]])}
        {select("branchId", "Branch", (options?.branches ?? []).map((b) => [b.id, b.branchName]))}
        {select("departmentId", "Department", (options?.departments ?? []).map((d) => [d.id, d.departmentName]))}
        {select("employeeId", "Employee", (options?.people ?? []).map((p) => [p.id, `${p.employeeName} (${p.employeeCode})`]))}
        {select("vendorId", "Vendor", vendors.map((v) => [v.id, v.companyName]))}
        {select("paymentStatus", "Corporate credit", [["PAID", "Charged"], ["PENDING", "Pending"], ["FAILED", "Voided"]])}
      </div>
      {f.when && <p className="border-t border-neutral-100 px-5 py-2 text-xs text-neutral-500">Showing upcoming trips only.</p>}
    </Panel>
    <Panel title="Bookings" description={data ? `${data.total.toLocaleString("en-IN")} matching` : undefined}>
      <Tabs label="Booking status" value={view} onChange={(v) => { setView(v); setPage(1); }} items={[
        { value: "", label: "Active view" }, { value: "upcoming", label: "Upcoming", count: counts?.upcoming }, { value: "ongoing", label: "Ongoing", count: counts?.ongoing },
        { value: "completed", label: "Completed", count: counts?.completed }, { value: "cancelled", label: "Cancelled", count: counts?.cancelled }, { value: "archived", label: "Archived", count: counts?.archived },
      ]}/>
      <DataState loading={loading} error={error} onRetry={reload}>{data && <>
        <BookingTable rows={data.items} empty={view === "archived" ? "No bookings have been removed from the active view." : "No bookings match these filters."}/>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/>
      </>}</DataState>
    </Panel>
    <p className="text-xs text-neutral-500">Archiving only hides a completed or cancelled booking from your active view. The booking, its invoice and its financial history are kept and still count in billing and reports.</p>
  </>;
}

export default function BookingsPage() { return <Suspense><Bookings/></Suspense>; }
