"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Approval } from "@/components/corporate-admin/types";
import { API, DataState, Detail, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Detailed = Approval & { workflow: { level: number; stage: string; approverDesignation: string }[]; history: { at: string; by: string; detail: Record<string, unknown> | null }[] };

export default function ApprovalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminData<Detailed>(`${API}/approvals?id=${encodeURIComponent(id)}`);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [done, setDone] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();
  const completing = useSubmit();

  async function complete() {
    const booked = await completing.run(() => send<{ id: string; bookingNumber: string }>("booking-complete", { approvalId: id }));
    if (booked) { setDone(`Booked as ${booked.bookingNumber} at a fresh price, paid by Corporate Credit.`); void reload(); }
  }

  async function confirm() {
    if (!decision) return;
    if (decision === "REJECT" && !remarks.trim()) { setError("Add a reason for rejecting this request."); return; }
    const result = await run(() => send<{ status: string; currentStage: string }>("approvals", { id, action: decision, remarks }));
    if (result) {
      setDone(result.status === "PENDING" ? `Step approved. The request moved to the ${result.currentStage.toLowerCase()} stage.` : `Request ${result.status.toLowerCase()}. The employee has been notified in the RideGrid app.`);
      setDecision(null); setRemarks(""); void reload();
    }
  }

  const pickupPassed = data?.ride ? Date.parse(data.ride.pickupDateTime) <= Date.now() : false;
  const decidable = data?.rawStatus === "PENDING" && !pickupPassed;

  return <>
    <PageHeader back={{ href: "/corporate-admin/approvals", label: "Approval requests" }} title={data ? `Request from ${data.employee.name}` : "Approval request"} description={data ? `Submitted ${when(data.submittedAt)}` : undefined}>
      {decidable && <>
        <button className="rg-secondary" onClick={() => { setDecision("REJECT"); setError(""); }}><X size={15}/>Reject</button>
        <button className="rg-primary" onClick={() => { setDecision("APPROVE"); setError(""); }}><Check size={15}/>Approve</button>
      </>}
    </PageHeader>
    {done && <Notice tone="success">{done}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <div className="flex flex-wrap items-center gap-3"><Status value={data.status}/>{data.rawStatus === "PENDING" && pickupPassed && <span className="text-sm text-neutral-500">The pickup time has passed; this request can no longer be approved.</span>}{data.booking && <Link className="text-sm font-semibold text-red-700" href={`/corporate-admin/bookings/${data.booking.id}`}>Booked as {data.booking.bookingNumber} →</Link>}{data.status === "APPROVED" && !data.booking && <><span className="text-sm text-neutral-500">Approved — not booked yet. The employee can book it in their app, or you can book it now at a fresh price.</span><button className="rg-primary rg-sm" disabled={completing.busy} onClick={() => void complete()}>{completing.busy ? "Booking…" : "Complete booking"}</button></>}{data.ride?.portal?.guest && <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">Guest booking</span>}</div>
      {completing.error && <Notice tone="error">{completing.error}</Notice>}
      {data.ride?.portal?.guest && <Notice tone="info">Guest: <b>{data.ride.portal.guest.name}</b> · {data.ride.portal.guest.mobile}{data.ride.portal.guest.email ? ` · ${data.ride.portal.guest.email}` : ""}{data.ride.portal.guest.reference ? ` · Ref ${data.ride.portal.guest.reference}` : ""} — requested by {data.ride.portal.bookedBy} through the Corporate Portal.</Notice>}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Requested ride" description="Snapshot captured when the employee submitted the request. The fare is re-quoted before booking.">
            {data.ride ? <Detail items={[
              ["Service", `${data.ride.serviceType.toLowerCase()} · ${data.ride.tripType === "ROUNDTRIP" ? "round trip" : "one way"}${Number(data.ride.days) > 1 ? ` · ${data.ride.days} days` : ""}`],
              ["Pickup time", when(data.ride.pickupDateTime)],
              ["Pickup", data.ride.pickupAddress],
              ["Destination", data.ride.dropAddress],
              ["Route / package", [data.ride.route.pickupCity, data.ride.route.dropCity].filter(Boolean).join(" → ") + (data.ride.route.packageName ? ` · ${data.ride.route.packageName}` : "")],
              ["Vehicle", `${data.ride.vehicle.make} ${data.ride.vehicle.model} (${data.ride.vehicle.category})`],
              ["Vendor", data.ride.vendorName],
              ["Quoted amount", <span key="q" className="font-semibold">{inr(data.ride.fare.finalPayable)}</span>],
              ["Fare detail", `Fare ${inr(data.ride.fare.vendorFare)} · platform fee ${inr(data.ride.fare.platformFee)} · tax ${inr(data.ride.fare.taxAmount)}`],
              ["Employee note", data.ride.note || "—"],
            ]}/> : <p className="p-5 text-sm text-neutral-500">Ride details were not captured for this request.</p>}
          </Panel>
          <Panel title="Policy and budget result" description="Reasons returned by the travel policy and budget evaluation when the request was submitted.">
            {data.ride?.policyReasons.length ? <ul className="list-disc space-y-1 px-10 py-4 text-sm">{data.ride.policyReasons.map((r) => <li key={r} className={/budget|limit/i.test(r) ? "text-amber-800" : ""}>{r}</li>)}</ul> : <p className="p-5 text-sm text-neutral-500">No policy reason was recorded.</p>}
            <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">After approval the employee books at a fresh quote; policy, budget and corporate credit are checked again at that moment.</p>
          </Panel>
          <Panel title="History" description="Audit trail for this request.">
            {data.history.length ? <ul className="divide-y divide-neutral-100 text-sm">{data.history.map((h, i) => <li key={i} className="flex flex-wrap justify-between gap-2 px-5 py-3"><span>{h.by}: {String(h.detail?.decision ?? "updated").toLowerCase()}{h.detail?.remarks ? ` — “${String(h.detail.remarks)}”` : ""}</span><span className="text-xs text-neutral-500">{when(h.at)}</span></li>)}</ul> : <p className="p-5 text-sm text-neutral-500">Submitted {when(data.submittedAt)}; no decisions yet.</p>}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Employee">
            <Detail items={[["Name", data.employee.name], ["Employee code", data.employee.code], ["Designation", data.employee.designation], ["Branch", data.employee.branch?.name ?? "—"], ["Department", data.employee.department?.name ?? "—"], ["Monthly limit", inr(data.employee.monthlyTravelLimit)]]}/>
            <div className="border-t border-neutral-100 px-5 py-3"><Link className="text-sm font-semibold text-red-700" href={`/corporate-admin/employees/${data.employee.id}`}>Employee profile →</Link></div>
          </Panel>
          <Panel title="Approval steps" description="Created from your approval workflow when the request was submitted. Company administrators can decide any step.">
            <ol className="space-y-4 p-5">{data.steps.map((s) => <li key={s.level} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">{s.level}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{s.assignedTo}</span><Status value={s.status}/></div>{s.actedAt && <p className="mt-1 text-xs text-neutral-500">Decided by {s.approver ?? "approver"} · {when(s.actedAt)}</p>}{s.remarks && <p className="mt-1 text-sm text-neutral-700">“{s.remarks}”</p>}</div></li>)}</ol>
          </Panel>
        </div>
      </div>
    </>}</DataState>

    <Modal open={!!decision} title={decision === "APPROVE" ? "Approve this ride request?" : "Reject this ride request?"} onClose={() => setDecision(null)} footer={<>
      <button className="rg-secondary" onClick={() => setDecision(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={confirm} disabled={busy}>{busy ? "Saving…" : decision === "APPROVE" ? "Confirm approval" : "Confirm rejection"}</button>
    </>}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">{decision === "APPROVE"
          ? `${data?.employee.name} will be notified. They then confirm the booking at a fresh price and live availability; no car is held until they do.`
          : `${data?.employee.name} will be notified that the request was not approved, with your reason.`}</p>
        <Field label={decision === "REJECT" ? "Reason (required)" : "Note to employee (optional)"}><textarea className="rg-input min-h-24" maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)}/></Field>
        {saveError && <Notice tone="error">{saveError}</Notice>}
      </div>
    </Modal>
  </>;
}
