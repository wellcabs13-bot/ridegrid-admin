"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { Approval, Paged } from "@/components/corporate-admin/types";
import { API, DataState, Empty, Field, inr, Modal, Notice, PageHeader, Pagination, Panel, qs, send, Status, Tabs, useAdminData, useDebounced, useSubmit, when } from "@/components/corporate-admin/ui";

const TABS = [["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["", "All requests"]] as const;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
const SERVICE: Record<string, string> = { LOCAL: "Local", OUTSTATION: "Outstation" };

type Row = Approval & { ride: (Approval["ride"] & { portal?: { guest?: { name: string } } | null }) | null };

function Approvals() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{ row: Row; action: "APPROVE" | "REJECT" } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [notice, setNotice] = useState("");
  const query = useDebounced(q);
  const { busy, error: saveError, setError, run } = useSubmit();
  const { data, loading, error, reload } = useAdminData<Paged<Row> & { counts: Record<string, number> }>(`${API}/approvals${qs({ status, q: query, page })}`);

  const actionable = (r: Row) => r.rawStatus === "PENDING" && !!r.ride && Date.parse(r.ride.pickupDateTime) > Date.now();
  async function confirm() {
    if (!deciding) return;
    if (deciding.action === "REJECT" && !remarks.trim()) { setError("Add a reason for rejecting this request."); return; }
    // The decision is made on the server by the approval engine; this only submits the administrator's choice.
    const result = await run(() => send<{ status: string; currentStage: string }>("approvals", { id: deciding.row.id, action: deciding.action, remarks }));
    if (result) {
      setNotice(result.status === "PENDING" ? `Step approved. The request moved to the ${result.currentStage.toLowerCase()} stage.` : `Request ${result.status.toLowerCase()}.`);
      setDeciding(null); setRemarks(""); void reload();
    }
  }

  return <>
    <PageHeader title="Travel requests & approvals" description="Ride requests that needed approval under your travel policy and workflow. Your decision updates the same request the traveller sees.">
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    {notice && <Notice tone="success">{notice}</Notice>}
    <Panel title="Requests" action={<label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input aria-label="Search employee" placeholder="Search employee…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rg-input w-56 pl-9"/></label>}>
      <Tabs label="Approval status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={TABS.map(([value, text]) => ({ value, label: text, count: value ? data?.counts[value] ?? null : null }))}/>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <>
        <ul className="divide-y divide-neutral-100">{data.items.map((r) => {
          const pending = r.steps.find((s) => s.status === "PENDING");
          return <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[13px] font-bold text-red-700">{initials(r.employee.name)}</span>
            <div className="min-w-[200px] flex-1">
              <Link href={`/corporate-admin/approvals/${r.id}`} className="text-[14px] font-bold hover:text-red-700">{r.employee.name}{r.ride?.portal?.guest && <span className="ml-2 rounded-full bg-neutral-900 px-1.5 py-0.5 align-middle text-[9.5px] font-bold uppercase tracking-wide text-white">Guest: {r.ride.portal.guest.name}</span>}</Link>
              <p className="truncate text-xs text-neutral-500">{[r.employee.department?.name, r.employee.branch?.name].filter(Boolean).join(" · ") || r.employee.code}</p>
              {r.ride && <p className="mt-0.5 truncate text-[12.5px] text-neutral-700">{r.ride.pickupAddress} <span className="text-neutral-400">→</span> {r.ride.dropAddress}</p>}
              {r.ride && <p className="text-xs text-neutral-500">{when(r.ride.pickupDateTime)} · {r.ride.vehicle.make} {r.ride.vehicle.model}</p>}
            </div>
            <div className="flex flex-col items-start gap-1">
              {r.ride && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-sky-700">{SERVICE[r.ride.serviceType] ?? r.ride.serviceType} · {r.ride.tripType === "ROUNDTRIP" ? "Round trip" : "One way"}</span>}
              <span title={r.ride?.policyReasons.join(" ")} className="text-[11.5px] text-neutral-500">{r.ride?.policyReasons.length ? `${r.ride.policyReasons.length} policy flag${r.ride.policyReasons.length === 1 ? "" : "s"}` : "No policy flags"}</span>
            </div>
            <div className="min-w-[110px] text-right">
              <p className="text-[16px] font-bold tabular-nums">{inr(r.amount)}</p>
              <Status value={r.status}/>
              {r.status === "PENDING" && pending && <p className="mt-1 max-w-44 truncate text-[11.5px] text-neutral-500">{r.steps.length > 1 ? `Step ${pending.level} of ${r.steps.length} · ` : ""}{pending.assignedTo}</p>}
            </div>
            <div className="flex min-w-[150px] items-center justify-end gap-2">
              {actionable(r) ? <>
                <button className="rg-success rg-sm" onClick={() => { setDeciding({ row: r, action: "APPROVE" }); setError(""); setRemarks(""); }}><Check size={14}/>Approve</button>
                <button className="rg-danger rg-sm" onClick={() => { setDeciding({ row: r, action: "REJECT" }); setError(""); setRemarks(""); }}><X size={14}/>Reject</button>
              </> : <Link href={`/corporate-admin/approvals/${r.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-red-600">Details<ChevronRight size={14}/></Link>}
            </div>
          </li>;
        })}</ul>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/>
      </> : <Empty>No requests match this view.</Empty>)}</DataState>
    </Panel>
    <p className="text-xs text-neutral-500">Requests shown as expired had a pickup time that passed before a decision or booking. Approving never books a car by itself: the ride is booked at a fresh price and live availability, by the employee or by you with “Complete booking”.</p>

    <Modal open={!!deciding} title={deciding?.action === "APPROVE" ? "Approve this ride request?" : "Reject this ride request?"} onClose={() => setDeciding(null)} footer={<>
      <button className="rg-secondary" onClick={() => setDeciding(null)} disabled={busy}>Cancel</button>
      <button className={deciding?.action === "APPROVE" ? "rg-success" : "rg-primary"} onClick={confirm} disabled={busy}>{busy ? "Saving…" : deciding?.action === "APPROVE" ? "Confirm approval" : "Confirm rejection"}</button>
    </>}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">{deciding?.action === "APPROVE" ? `${deciding.row.employee.name} will be notified.` : `${deciding?.row.employee.name} will be told the request was not approved, with your reason.`}</p>
        <Field label={deciding?.action === "REJECT" ? "Reason (required)" : "Note (optional)"}><textarea className="rg-input min-h-24" maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)}/></Field>
        {saveError && <Notice tone="error">{saveError}</Notice>}
      </div>
    </Modal>
  </>;
}

export default function ApprovalsPage() { return <Suspense><Approvals/></Suspense>; }
