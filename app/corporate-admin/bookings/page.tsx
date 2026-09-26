"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, RotateCcw } from "lucide-react";
import { BookingTable } from "@/components/corporate-admin/tables";
import { Booking, Paged } from "@/components/corporate-admin/types";
import { API, DataState, PageHeader, Pagination, Panel, qs, useAdminData, useDebounced } from "@/components/corporate-admin/ui";

type Options = { branches: { id: string; branchName: string }[]; departments: { id: string; departmentName: string }[] };
const BOOKING = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED", "TRIP_COMPLETED", "CANCELLED"];
const TRIP = ["ASSIGNED", "ARRIVED_AT_PICKUP", "STARTED", "PASSENGER_ONBOARD", "COMPLETED", "CANCELLED"];
const text = (v: string) => v.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function Bookings() {
  const params = useSearchParams();
  const initial = { q: "", from: "", to: "", status: params.get("status") ?? "", tripStatus: "", approval: "", service: "", vendorId: "", branchId: "", departmentId: "", paymentMethod: "", paymentStatus: "", employeeId: params.get("employeeId") ?? "", when: params.get("when") ?? "" };
  const [f, setF] = useState(initial);
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q);
  const set = (k: keyof typeof initial) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const { data: options } = useAdminData<Options>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<Paged<Booking> & { vendors: { id: string; companyName: string }[] | null }>(`${API}/bookings${qs({ ...f, q, page })}`);
  const [vendors, setVendors] = useState<{ id: string; companyName: string }[]>([]);
  // Vendor options are returned with the first page only.
  useEffect(() => { if (data?.vendors) setVendors(data.vendors); }, [data]);
  const select = (k: keyof typeof initial, label: string, values: [string, string][]) =>
    <select aria-label={label} className="rg-input" value={f[k]} onChange={set(k)}><option value="">{label}: all</option>{values.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>;
  return <>
    <PageHeader title="Company bookings" description="Every RideGrid booking made for your company, read from the central booking record shared with RideGrid operations, vendors and drivers.">
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    <Panel title="Filters" action={<button className="rg-secondary" onClick={() => { setF({ ...initial, status: "", employeeId: "", when: "" }); setPage(1); }}><RotateCcw size={14}/>Reset</button>}>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <input aria-label="Search booking or employee" placeholder="Booking no. or employee…" className="rg-input sm:col-span-2" value={f.q} onChange={set("q")}/>
        <label className="text-xs text-neutral-500">From<input type="date" className="rg-input mt-1" value={f.from} onChange={set("from")}/></label>
        <label className="text-xs text-neutral-500">To<input type="date" className="rg-input mt-1" value={f.to} onChange={set("to")}/></label>
        {select("status", "Booking status", BOOKING.map((s) => [s, text(s)]))}
        {select("tripStatus", "Trip status", TRIP.map((s) => [s, text(s)]))}
        {select("approval", "Approval", [["REQUIRED", "Approved requests"], ["DIRECT", "No approval needed"]])}
        {select("service", "Service", [["LOCAL", "Local"], ["ONE_WAY", "One way"], ["ROUNDTRIP", "Round trip"]])}
        {select("branchId", "Branch", (options?.branches ?? []).map((b) => [b.id, b.branchName]))}
        {select("departmentId", "Department", (options?.departments ?? []).map((d) => [d.id, d.departmentName]))}
        {select("vendorId", "Vendor", vendors.map((v) => [v.id, v.companyName]))}
        {select("paymentMethod", "Payment", [["CORPORATE_CREDIT", "Corporate credit"], ["CASH", "Cash"], ["UPI", "UPI"], ["CARD", "Card"]])}
        {select("paymentStatus", "Payment state", ["PENDING", "PAID", "PARTIAL", "FAILED", "REFUNDED"].map((s) => [s, text(s)]))}
      </div>
      {(f.employeeId || f.when) && <p className="border-t border-neutral-100 px-5 py-2 text-xs text-neutral-500">{f.employeeId ? "Showing one employee's bookings. " : ""}{f.when ? "Showing upcoming trips only." : ""}</p>}
    </Panel>
    <Panel title="Bookings" description={data ? `${data.total.toLocaleString("en-IN")} matching` : undefined}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && <>
        <BookingTable rows={data.items}/>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/>
      </>}</DataState>
    </Panel>
  </>;
}

export default function BookingsPage() { return <Suspense><Bookings/></Suspense>; }
