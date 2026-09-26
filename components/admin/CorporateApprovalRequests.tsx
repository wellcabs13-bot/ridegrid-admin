"use client";
import { useState } from "react";
import { apiData, Badge, DataState, date, label, useAdminData } from "./Primitives";

type Request = {
  id: string; status: string; displayStatus: string; amount: string | null; currentStage: string; submittedAt: string;
  employee: { employeeName: string; employeeCode: string; designation: string; department: { departmentName: string } | null };
  requestSnapshot: { pickupDateTime?: string; pickupAddress?: string; dropAddress?: string; route?: { pickupCity: string; dropCity: string; packageName: string }; vehicle?: { make: string; model: string; category: string }; policyReasons?: string[]; note?: string } | null;
  steps: { level: number; stage: string; status: string; remarks: string | null }[];
};

// Shared corporate approval queue: the employee app submits, approvers decide here.
export default function CorporateApprovalRequests({ corporateId }: { corporateId: string }) {
  const { data, loading, error, reload } = useAdminData<Request[]>(`/api/corporate/approval-requests?corporateId=${encodeURIComponent(corporateId)}`);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function decide(id: string, action: "APPROVE" | "REJECT") {
    const remarks = action === "REJECT" ? window.prompt("Reason for rejecting this request") || "" : window.prompt("Optional note for the employee") || "";
    if (action === "REJECT" && !remarks.trim()) return;
    setBusy(id); setMessage("");
    try {
      await apiData("/api/corporate/approval-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, remarks }) });
      setMessage(action === "APPROVE" ? "Decision recorded: approved." : "Decision recorded: rejected.");
      await reload();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to record the decision."); }
    finally { setBusy(""); }
  }
  const rows = Array.isArray(data) ? data : [];
  return (
    <DataState loading={loading} error={error} empty={!rows.length} onRetry={reload}>
      {message && <p role="status" className="text-sm text-neutral-600">{message}</p>}
      <div className="space-y-3">
        {rows.map((r) => {
          const s = r.requestSnapshot;
          return (
            <article key={r.id} className="rg-card space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{r.employee.employeeName} <span className="text-sm font-normal text-neutral-500">({r.employee.employeeCode} · {r.employee.designation}{r.employee.department ? ` · ${r.employee.department.departmentName}` : ""})</span></p>
                <Badge>{label(r.displayStatus)}</Badge>
              </div>
              <p className="text-sm">{s?.route ? `${s.route.pickupCity}${s.route.dropCity ? ` to ${s.route.dropCity}` : ""} · ${s.route.packageName}` : "Ride details unavailable"}</p>
              <p className="text-sm text-neutral-500">Pickup {date(s?.pickupDateTime)} · {s?.vehicle ? `${s.vehicle.make} ${s.vehicle.model} (${label(s.vehicle.category)})` : ""} · Quoted {r.amount ? `INR ${Number(r.amount).toLocaleString("en-IN")}` : "not available"}</p>
              {s?.pickupAddress && <p className="text-sm text-neutral-500">{s.pickupAddress} to {s.dropAddress}</p>}
              {!!s?.policyReasons?.length && <ul className="list-disc pl-5 text-sm text-amber-700">{s.policyReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              {s?.note && <p className="text-sm">Employee note: {s.note}</p>}
              <p className="text-xs text-neutral-500">Stage: {label(r.currentStage)} · Steps: {r.steps.map((step) => `${step.level}. ${label(step.stage)} ${label(step.status)}`).join(", ")} · Submitted {date(r.submittedAt)}</p>
              {r.displayStatus === "PENDING" && (
                <div className="flex gap-2">
                  <button type="button" className="rg-primary" disabled={busy === r.id} onClick={() => void decide(r.id, "APPROVE")}>Approve</button>
                  <button type="button" className="rg-secondary" disabled={busy === r.id} onClick={() => void decide(r.id, "REJECT")}>Reject</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </DataState>
  );
}
