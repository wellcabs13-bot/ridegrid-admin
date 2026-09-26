"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Approval } from "@/components/corporate-admin/types";
import { API, DataState, Detail, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Detailed = Approval & { workflow: { level: number; stage: string; approverDesignation: string; maxAmount: number | null }[] };

export default function ApprovalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminData<Detailed>(`${API}/approvals?id=${encodeURIComponent(id)}`);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [done, setDone] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();

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
      <div className="flex flex-wrap items-center gap-3"><Status value={data.status}/>{data.rawStatus === "PENDING" && pickupPassed && <span className="text-sm text-neutral-500">The pickup time has passed; this request can no longer be approved.</span>}{data.booking && <Link className="text-sm font-semibold text-red-700" href={`/corporate-admin/bookings/${data.booking.id}`}>Booked as {data.booking.bookingNumber} →</Link>}{data.status === "APPROVED" && !data.booking && <span className="text-sm text-neutral-500">Approved — waiting for the employee to confirm the booking at a fresh price.</span>}</div>
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
          <Panel title="Why approval is required" description="Reasons returned by the company travel policy evaluation.">
            {data.ride?.policyReasons.length ? <ul className="list-disc space-y-1 px-10 py-4 text-sm">{data.ride.policyReasons.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="p-5 text-sm text-neutral-500">No policy reason was recorded.</p>}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Employee">
            <Detail items={[["Name", data.employee.name], ["Employee code", data.employee.code], ["Designation", data.employee.designation], ["Branch", data.employee.branch?.name ?? "—"], ["Department", data.employee.department?.name ?? "—"], ["Monthly limit", inr(data.employee.monthlyTravelLimit)]]}/>
            <div className="border-t border-neutral-100 px-5 py-3"><Link className="text-sm font-semibold text-red-700" href={`/corporate-admin/employees/${data.employee.id}`}>Employee profile →</Link></div>
          </Panel>
          <Panel title="Approval steps" description="Steps are created from your approval workflow when the request is submitted.">
            <ol className="space-y-4 p-5">{data.steps.map((s) => <li key={s.level} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">{s.level}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium capitalize">{s.stage.toLowerCase().replaceAll("_", " ")}</span><Status value={s.status}/></div>{s.actedAt && <p className="mt-1 text-xs text-neutral-500">{s.approver ?? "Approver"} · {when(s.actedAt)}</p>}{s.remarks && <p className="mt-1 text-sm text-neutral-700">“{s.remarks}”</p>}</div></li>)}</ol>
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
