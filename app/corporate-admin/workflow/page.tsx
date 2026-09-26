"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { API, DataState, Empty, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit } from "@/components/corporate-admin/ui";

type Rule = { id: string; level: number; approverDesignation: string; maxAmount: string | null; isActive: boolean };
type Form = { id?: string; level: string; approverDesignation: string; maxAmount: string };

export default function WorkflowPage() {
  const { data, loading, error, reload } = useAdminData<{ approvalFlow: string | null; rules: Rule[] }>(`${API}/workflow`);
  const [form, setForm] = useState<Form | null>(null);
  const [toggle, setToggle] = useState<Rule | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  async function save() {
    if (!form) return;
    const body = { level: Number(form.level), approverDesignation: form.approverDesignation, maxAmount: form.maxAmount || null };
    if (await run(() => send("workflow", form.id ? { action: "UPDATE", id: form.id, ...body } : { action: "CREATE", ...body }))) { setForm(null); void reload(); }
  }
  async function flip() {
    if (!toggle) return;
    if (await run(() => send("workflow", { action: "SET_ACTIVE", id: toggle.id, isActive: !toggle.isActive }))) { setToggle(null); void reload(); }
  }
  const active = data?.rules.filter((r) => r.isActive) ?? [];
  const next = (data?.rules.reduce((m, r) => Math.max(m, r.level), 0) ?? 0) + 1;
  return <>
    <PageHeader title="Approval workflow" description="Steps a ride request passes through when your travel policy requires approval. Steps are copied onto each request when it is submitted; later changes apply to new requests only.">
      <button className="rg-primary" disabled={next > 10} onClick={() => { setError(""); setForm({ level: String(next), approverDesignation: "", maxAmount: "" }); }}><Plus size={15}/>Add step</button>
    </PageHeader>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="grid gap-6 xl:grid-cols-3">
      <Panel className="xl:col-span-2" title="Approval steps" description="Decided in order, lowest level first. Any company administrator can record each step's decision.">
        {data.rules.length ? <div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Level</th><th>Approver</th><th>Applies to trips up to</th><th>Status</th><th/></tr></thead>
          <tbody>{data.rules.map((r) => <tr key={r.id}>
            <td className="font-semibold">{r.level}</td><td>{r.approverDesignation}</td><td>{r.maxAmount ? inr(r.maxAmount) : "Any amount"}</td><td><Status value={r.isActive ? "ACTIVE" : "INACTIVE"}/></td>
            <td className="whitespace-nowrap text-right"><button className="rg-secondary mr-2" onClick={() => { setError(""); setForm({ id: r.id, level: String(r.level), approverDesignation: r.approverDesignation, maxAmount: r.maxAmount ?? "" }); }}>Edit</button><button className="rg-secondary" onClick={() => { setError(""); setToggle(r); }}>{r.isActive ? "Disable" : "Enable"}</button></td>
          </tr>)}</tbody>
        </table></div> : <Empty>No approval steps configured. Each request then needs a single company administrator decision.</Empty>}
      </Panel>
      <Panel title="How requests are routed">
        <div className="space-y-3 p-5 text-sm text-neutral-600">
          <p>{active.length ? `A request gets one step for each active level whose amount ceiling is empty or at least the trip amount (${active.length} active level${active.length > 1 ? "s" : ""}).` : "With no active steps, one company administrator decision approves or rejects the request."}</p>
          <p>Approving the last step marks the request <strong>approved</strong>; the employee then books at a fresh price. Rejecting any step ends the request.</p>
          <p className="text-xs text-neutral-500">Company approval flow on your RideGrid account: {data.approvalFlow ? data.approvalFlow.replaceAll("_", " ").toLowerCase() : "—"} (set by RideGrid).</p>
        </div>
      </Panel>
    </div>}</DataState>
    <Modal open={!!form} title={form?.id ? "Edit approval step" : "Add approval step"} onClose={() => setForm(null)} footer={<><button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save step"}</button></>}>
      {form && <div className="space-y-4">
        <Field label="Level (1–10)"><input className="rg-input" inputMode="numeric" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}/></Field>
        <Field label="Approver" hint="The designation that decides this step, e.g. Reporting manager or Finance head."><input className="rg-input" maxLength={80} value={form.approverDesignation} onChange={(e) => setForm({ ...form, approverDesignation: e.target.value })}/></Field>
        <Field label="Applies to trips up to (₹)" hint="Empty applies the step to every amount."><input className="rg-input" inputMode="decimal" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}/></Field>
        {saveError && <Notice tone="error">{saveError}</Notice>}
      </div>}
    </Modal>
    <Modal open={!!toggle} title={toggle?.isActive ? "Disable this step?" : "Enable this step?"} onClose={() => setToggle(null)} footer={<><button className="rg-secondary" onClick={() => setToggle(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={flip} disabled={busy}>Confirm</button></>}>
      <p className="text-sm text-neutral-600">New approval requests will {toggle?.isActive ? "skip" : "include"} level {toggle?.level} ({toggle?.approverDesignation}). Requests already submitted are unchanged.</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
