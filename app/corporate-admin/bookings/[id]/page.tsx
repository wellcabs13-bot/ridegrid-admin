"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Ban, MapPin, Pencil, RefreshCw } from "lucide-react";
import { Approval, Booking } from "@/components/corporate-admin/types";
import { API, DataState, Detail, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, statusText, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Trip = { status: string; driverAssignedAt: string | null; driverAcceptedAt: string | null; arrivedPickupAt: string | null; passengerBoardedAt: string | null; tripStartedAt: string | null; tripCompletedAt: string | null; cancelledAt: string | null };
type Detailed = Booking & {
  reservedFrom: string | null; reservedUntil: string | null; cancelReason: string | null; cancelledAt: string | null;
  trip: Trip | null;
  timeline: { previousStatus: string | null; currentStatus: string; action: string; remarks: string | null; changedAt: string }[];
  approvalRequest: Approval | null;
  invoice: { id: string; invoiceNumber: string; totalAmount: string; taxAmount: string; paymentStatus: string; invoiceDate: string; dueDate: string | null; downloadUrl: string } | null;
  liveLocation: { latitude: number; longitude: number; accuracy: number | null; recordedAt: string } | null;
  actions: { edit: boolean; cancel: boolean; archive: boolean; restore: boolean };
};
type Action = "EDIT" | "CANCEL" | "ARCHIVE" | "RESTORE";

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const DONE: Record<Action, string> = {
  CANCEL: "Booking cancelled. Any corporate credit it used has been restored and the vendor and driver were notified.",
  EDIT: "Booking updated. The change is recorded in the booking history.",
  ARCHIVE: "Removed from your active view. The booking and its financial history are kept.",
  RESTORE: "Returned to your active view.",
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
  const [action, setAction] = useState<Action | null>(null);
  const [form, setForm] = useState({ pickupLocation: "", dropLocation: "", pickupDateTime: "", reason: "" });
  const [done, setDone] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();

  function open(a: Action) {
    setError(""); setAction(a);
    if (b) setForm({ pickupLocation: b.pickupLocation, dropLocation: b.dropLocation, pickupDateTime: localInput(b.pickupDateTime), reason: "" });
  }
  async function submit() {
    if (!b || !action) return;
    const body: Record<string, unknown> = { id: b.id, action };
    if (action === "CANCEL" || action === "EDIT") body.reason = form.reason;
    if (action === "EDIT") {
      if (form.pickupLocation !== b.pickupLocation) body.pickupLocation = form.pickupLocation;
      if (form.dropLocation !== b.dropLocation) body.dropLocation = form.dropLocation;
      const next = new Date(form.pickupDateTime);
      if (!Number.isNaN(next.getTime()) && next.getTime() !== new Date(b.pickupDateTime).getTime()) body.pickupDateTime = next.toISOString();
    }
    if (await run(() => send("bookings", body))) { setDone(DONE[action]); setAction(null); void reload(); }
  }
  const needsReason = action === "CANCEL" || action === "EDIT";

  return <>
    <PageHeader back={{ href: "/corporate-admin/bookings", label: "Bookings" }} title={b ? `Booking ${b.bookingNumber}` : "Booking"} description={b ? `${b.traveller} · pickup ${when(b.pickupDateTime)}` : undefined}>
      {b?.actions.edit && <button className="rg-secondary" onClick={() => open("EDIT")}><Pencil size={15}/>Edit</button>}
      {b?.actions.cancel && <button className="rg-secondary" onClick={() => open("CANCEL")}><Ban size={15}/>Cancel booking</button>}
      {b?.actions.archive && <button className="rg-secondary" onClick={() => open("ARCHIVE")}><Archive size={15}/>Archive</button>}
      {b?.actions.restore && <button className="rg-secondary" onClick={() => open("RESTORE")}><ArchiveRestore size={15}/>Restore</button>}
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    {done && <Notice tone="success">{done}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{b && <>
      <div className="flex flex-wrap items-center gap-2"><Status value={b.status}/>{b.tripStatus && <Status value={b.tripStatus}/>}{!b.driver && <Status value={b.assignment}/>}{b.archived && <Status value="ARCHIVED"/>}<Status value={b.credit}/></div>
      {b.status === "CANCELLED" ? <Panel title="Cancelled"><Detail items={[["Cancelled at", when(b.cancelledAt)], ["Reason", b.cancelReason ?? "—"]]}/></Panel> :
        <section className="rg-card p-5" aria-label="Trip progress"><ol className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">{progress(b).map((s) => <li key={s.label} className="flex items-start gap-2"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.done ? "bg-emerald-600" : "bg-neutral-300"}`}/><div><p className={`text-sm ${s.done ? "font-semibold" : "text-neutral-500"}`}>{s.label}</p><p className="text-xs text-neutral-500">{s.at ? when(s.at) : s.done ? "Done" : "Pending"}</p></div></li>)}</ol></section>}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Trip">
            <Detail items={[
              ["Traveller", b.isGuest ? <span key="g"><b>{b.traveller}</b><span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Guest booking</span><span className="block text-xs text-neutral-500">{[b.guest?.mobile, b.guest?.email, b.guest?.reference && `Ref ${b.guest.reference}`].filter(Boolean).join(" · ")}</span></span> : b.employee ? <Link key="e" className="font-medium text-red-700" href={`/corporate-admin/employees/${b.employee.id}`}>{b.employee.name} ({b.employee.code})</Link> : b.traveller],
              ...(b.bookedBy ? [["Booked by", `${b.bookedBy} (Corporate Portal)${b.approvalBasis === "ADMIN_AUTHORISED" ? " · authorised by administrator" : ""}`] as [string, string]] : []),
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
          <Panel title="Charges and corporate credit">
            <Detail items={[
              ["Amount", <span key="a" className="text-lg font-semibold">{inr(b.finalFare)}</span>],
              ["Fare breakdown", b.fare ? `Fare ${inr(b.fare.vendorFare)} · fee ${inr(b.fare.platformFee)} · GST ${inr(b.fare.taxAmount)}` : "—"],
              ["GST", b.gst ? inr(b.gst) : "—"],
              ["Payment method", b.payment ? statusText(b.payment.method) : "—"],
              ["Corporate credit", <Status key="c" value={b.credit}/>],
              ["Invoice", b.invoice ? <a key="i" className="font-medium text-red-700" href={b.invoice.downloadUrl}>{b.invoice.invoiceNumber} · {inr(b.invoice.totalAmount)} · {statusText(b.invoice.paymentStatus)}</a> : b.status === "TRIP_COMPLETED" ? "Completed — awaiting invoice from RideGrid" : "Issued after the trip is completed"],
            ]}/>
          </Panel>
          <Panel title="Approval context">
            {b.approvalRequest ? <div className="space-y-2 p-5 text-sm"><Status value={b.approvalRequest.status}/><p>Approved request for {inr(b.approvalRequest.amount)} submitted {when(b.approvalRequest.submittedAt)}.</p>{b.approvalRequest.ride?.policyReasons.map((r) => <p key={r} className="text-xs text-neutral-500">• {r}</p>)}<Link className="font-semibold text-red-700" href={`/corporate-admin/approvals/${b.approvalRequest.id}`}>View request →</Link></div>
              : <p className="p-5 text-sm text-neutral-500">Booked directly — the travel policy allowed this trip without approval.</p>}
          </Panel>
        </div>
      </div>
    </>}</DataState>
    <Modal open={!!action} wide={action === "EDIT"} title={action === "EDIT" ? "Edit booking" : action === "CANCEL" ? "Cancel this booking?" : action === "ARCHIVE" ? "Remove from active view?" : "Restore to active view?"} onClose={() => setAction(null)} footer={<>
      <button className="rg-secondary" onClick={() => setAction(null)} disabled={busy}>Close</button>
      <button className="rg-primary" onClick={submit} disabled={busy || (needsReason && !form.reason.trim())}>{busy ? "Saving…" : action === "CANCEL" ? "Cancel booking" : "Confirm"}</button>
    </>}>
      <div className="space-y-4">
        {action === "EDIT" && <>
          <p className="text-sm text-neutral-600">You can correct the pickup and drop addresses, or move the pickup time within the same day. Changing the date, route, vehicle or price needs a cancellation and a new booking, so availability, pricing, budget and approval are all checked again.</p>
          <Field label="Pickup address"><input className="rg-input" maxLength={300} value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}/></Field>
          <Field label="Drop address"><input className="rg-input" maxLength={300} value={form.dropLocation} onChange={(e) => setForm({ ...form, dropLocation: e.target.value })}/></Field>
          <Field label="Pickup time" hint="Same calendar day only; the travel policy is checked again."><input type="datetime-local" className="rg-input" value={form.pickupDateTime} onChange={(e) => setForm({ ...form, pickupDateTime: e.target.value })}/></Field>
        </>}
        {action === "CANCEL" && <p className="text-sm text-neutral-600">The booking is cancelled through RideGrid&apos;s central cancellation. Corporate credit it used is restored, and the vendor and driver are notified.</p>}
        {action === "ARCHIVE" && <p className="text-sm text-neutral-600">The booking is hidden from your active list only. It stays in billing, invoices, reports and RideGrid records.</p>}
        {action === "RESTORE" && <p className="text-sm text-neutral-600">The booking returns to your active list.</p>}
        {needsReason && <Field label="Reason (required, recorded in the audit trail)"><textarea className="rg-input min-h-20" maxLength={300} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}/></Field>}
        {saveError && <Notice tone="error">{saveError}</Notice>}
      </div>
    </Modal>
  </>;
}
