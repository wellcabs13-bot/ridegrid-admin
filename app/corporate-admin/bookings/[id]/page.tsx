"use client";
import { use } from "react";
import Link from "next/link";
import { MapPin, RefreshCw } from "lucide-react";
import { Approval, Booking } from "@/components/corporate-admin/types";
import { API, DataState, Detail, inr, PageHeader, Panel, Status, statusText, useAdminData, when } from "@/components/corporate-admin/ui";

type Trip = { status: string; driverAssignedAt: string | null; driverAcceptedAt: string | null; arrivedPickupAt: string | null; passengerBoardedAt: string | null; tripStartedAt: string | null; tripCompletedAt: string | null; cancelledAt: string | null };
type Detailed = Booking & {
  reservedFrom: string | null; reservedUntil: string | null; cancelReason: string | null; cancelledAt: string | null;
  trip: Trip | null;
  timeline: { previousStatus: string | null; currentStatus: string; action: string; remarks: string | null; changedAt: string }[];
  approvalRequest: Approval | null;
  invoice: { id: string; invoiceNumber: string; totalAmount: string; paymentStatus: string; invoiceDate: string } | null;
  liveLocation: { latitude: number; longitude: number; accuracy: number | null; recordedAt: string } | null;
};

function progress(b: Detailed) {
  const t = b.trip;
  return [
    { label: "Booked", at: b.createdAt, done: true },
    { label: "Vendor confirmed", at: null, done: b.status !== "PENDING" && b.status !== "CANCELLED" || !!t },
    { label: "Driver assigned", at: t?.driverAssignedAt ?? null, done: !!b.driver },
    { label: "Driver arrived", at: t?.arrivedPickupAt ?? null, done: !!t?.arrivedPickupAt },
    { label: "Trip started", at: t?.tripStartedAt ?? null, done: !!t?.tripStartedAt || b.status === "TRIP_STARTED" || b.status === "TRIP_COMPLETED" },
    { label: "Trip completed", at: t?.tripCompletedAt ?? null, done: b.status === "TRIP_COMPLETED" },
  ];
}

export default function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: b, loading, error, reload } = useAdminData<Detailed>(`${API}/bookings?id=${encodeURIComponent(id)}`);
  return <>
    <PageHeader back={{ href: "/corporate-admin/bookings", label: "Bookings" }} title={b ? `Booking ${b.bookingNumber}` : "Booking"} description={b ? `${b.traveller} · pickup ${when(b.pickupDateTime)}` : undefined}>
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    <DataState loading={loading} error={error} onRetry={reload}>{b && <>
      <div className="flex flex-wrap items-center gap-2"><Status value={b.status}/>{b.tripStatus && <Status value={b.tripStatus}/>}{!b.driver && <Status value={b.assignment}/>}</div>
      {b.status === "CANCELLED" ? <Panel title="Cancelled"><Detail items={[["Cancelled at", when(b.cancelledAt)], ["Reason", b.cancelReason ?? "—"]]}/></Panel> :
        <section className="rg-card p-5" aria-label="Trip progress"><ol className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">{progress(b).map((s) => <li key={s.label} className="flex items-start gap-2"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.done ? "bg-emerald-600" : "bg-neutral-300"}`}/><div><p className={`text-sm ${s.done ? "font-semibold" : "text-neutral-500"}`}>{s.label}</p><p className="text-xs text-neutral-500">{s.at ? when(s.at) : s.done ? "Done" : "Pending"}</p></div></li>)}</ol></section>}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Trip">
            <Detail items={[
              ["Traveller", b.employee ? <Link key="e" className="font-medium text-red-700" href={`/corporate-admin/employees/${b.employee.id}`}>{b.employee.name} ({b.employee.code})</Link> : b.traveller],
              ["Branch / department", [b.employee?.branch?.name, b.employee?.department?.name].filter(Boolean).join(" · ") || "—"],
              ["Service", `${b.service.replaceAll("_", " ").toLowerCase()}${b.packageName ? ` · ${b.packageName}` : ""}${b.tripDays > 1 ? ` · ${b.tripDays} days` : ""}`],
              ["Pickup time", when(b.pickupDateTime)],
              ["Pickup", b.pickupLocation], ["Destination", b.dropLocation],
              ["Vehicle held", b.reservedFrom ? `${when(b.reservedFrom)} – ${when(b.reservedUntil)}` : "—"],
              ["Booked", when(b.createdAt)],
            ]}/>
          </Panel>
          <Panel title="Vendor, vehicle and driver" description="Assigned through the RideGrid Vendor App. The company cannot reassign vendors or drivers.">
            <Detail items={[
              ["Vendor", b.vendor.companyName],
              ["Assignment", statusText(b.assignment)],
              ["Vehicle", `${b.vehicle.make} ${b.vehicle.model} · ${b.vehicle.category}`],
              ["Registration", b.vehicle.registrationNumber],
              ["Driver", b.driver?.name ?? "Not assigned yet"],
              ["Driver mobile", b.driver?.mobile ?? (b.driver ? "Shared while the trip is live" : "—")],
            ]}/>
            {b.liveLocation && <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 px-5 py-4 text-sm"><MapPin size={16} className="text-red-600"/><span>Driver position at {when(b.liveLocation.recordedAt)}{b.liveLocation.accuracy ? ` (±${Math.round(b.liveLocation.accuracy)} m)` : ""}</span><a className="font-semibold text-red-700" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${b.liveLocation.latitude},${b.liveLocation.longitude}`}>Open map</a></div>}
            {!b.liveLocation && (b.status === "DRIVER_ASSIGNED" || b.status === "TRIP_STARTED") && <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">No recent verified driver location. Location appears only from the Driver App during an active trip.</p>}
          </Panel>
          <Panel title="Status history" description="Central booking timeline.">
            {b.timeline.length ? <ol className="divide-y divide-neutral-100">{b.timeline.map((t, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span className="flex items-center gap-2"><Status value={t.currentStatus}/>{t.remarks && <span className="text-neutral-600">{t.remarks}</span>}</span><span className="text-xs text-neutral-500">{when(t.changedAt)}</span></li>)}</ol> : <p className="p-5 text-sm text-neutral-500">No status changes recorded yet.</p>}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Charges and payment">
            <Detail items={[
              ["Amount", <span key="a" className="text-lg font-semibold">{inr(b.finalFare)}</span>],
              ["Fare breakdown", b.fare ? `Fare ${inr(b.fare.vendorFare)} · fee ${inr(b.fare.platformFee)} · tax ${inr(b.fare.taxAmount)}` : "—"],
              ["Payment method", b.payment ? statusText(b.payment.method) : "—"],
              ["Payment state", b.payment ? <Status key="p" value={b.payment.status}/> : "—"],
              ["Invoice", b.invoice ? <a key="i" className="font-medium text-red-700" href={`${API}/documents/invoice?id=${encodeURIComponent(b.invoice.id)}`}>{b.invoice.invoiceNumber} · {inr(b.invoice.totalAmount)}</a> : "Not issued yet"],
            ]}/>
          </Panel>
          <Panel title="Approval context">
            {b.approvalRequest ? <div className="space-y-2 p-5 text-sm"><Status value={b.approvalRequest.status}/><p>Approved request for {inr(b.approvalRequest.amount)} submitted {when(b.approvalRequest.submittedAt)}.</p>{b.approvalRequest.ride?.policyReasons.map((r) => <p key={r} className="text-xs text-neutral-500">• {r}</p>)}<Link className="font-semibold text-red-700" href={`/corporate-admin/approvals/${b.approvalRequest.id}`}>View request →</Link></div>
              : <p className="p-5 text-sm text-neutral-500">Booked directly — the travel policy allowed this trip without approval.</p>}
          </Panel>
        </div>
      </div>
    </>}</DataState>
  </>;
}
