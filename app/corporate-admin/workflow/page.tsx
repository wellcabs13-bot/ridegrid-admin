"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, UserRound } from "lucide-react";
import { OrgOptions } from "@/components/corporate-admin/types";
import { API, DataState, Empty, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit } from "@/components/corporate-admin/ui";

type Rule = {
  id: string; level: number; approverDesignation: string; isActive: boolean; maxAmount: string | null; minAmount: string | null;
  approverType: string; approverEmployeeId: string | null; approverName: string | null;
  scope: "COMPANY" | "BRANCH" | "DEPARTMENT" | "EMPLOYEE"; scopeBranchId: string | null; scopeDepartmentId: string | null; scopeEmployeeId: string | null; scopeName: string;
};
type View = { approvalFlow: string | null; approverTypes: { value: string; label: string }[]; rules: Rule[] };
type Form = { id?: string; level: string; approverType: string; approverEmployeeId: string; approverDesignation: string; scope: Rule["scope"]; scopeId: string; minAmount: string; maxAmount: string };

const HELP: Record<string, string> = {
  CORPORATE_ADMIN: "Any of your company's corporate administrators decides in this portal.",
  DEPARTMENT_HEAD: "The head set on the traveller's department.",
  DEPARTMENT_APPROVER: "The approver/manager set on the traveller's department.",
  REPORTING_MANAGER: "The traveller's reporting manager.",
  APPROVAL_MANAGER: "The traveller's approval manager (if different from the reporting manager).",
  SPECIFIC_EMPLOYEE: "One named person, e.g. the owner or finance head.",
};

export default function WorkflowPage() {
  const { data, loading, error, reload } = useAdminData<View>(`${API}/workflow`);
  const { data: o } = useAdminData<OrgOptions>(`${API}/org-options`);
  const [form, setForm] = useState<Form | null>(null);
  const [toggle, setToggle] = useState<Rule | null>(null);
  const [notice, setNotice] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();
  const label = (t: string) => data?.approverTypes.find((a) => a.value === t)?.label ?? t;
  async function save() {
    if (!form) return;
    const body = { level: Number(form.level), approverType: form.approverType, approverEmployeeId: form.approverEmployeeId || null, approverDesignation: form.approverDesignation || null, scope: form.scope, scopeId: form.scopeId || null, minAmount: form.minAmount || null, maxAmount: form.maxAmount || null };
    if (await run(() => send("workflow", form.id ? { action: "UPDATE", id: form.id, ...body } : { action: "CREATE", ...body }))) { setForm(null); setNotice("Workflow saved. It applies to new approval requests."); void reload(); }
  }
  async function flip() {
    if (toggle && await run(() => send("workflow", { action: "SET_ACTIVE", id: toggle.id, isActive: !toggle.isActive }))) { setToggle(null); void reload(); }
  }
  async function move(r: Rule, direction: "UP" | "DOWN") { if (await run(() => send("workflow", { action: "MOVE", id: r.id, direction }))) void reload(); }
  const rules = data?.rules ?? [];
  const next = (rules.reduce((m, r) => Math.max(m, r.level), 0)) + 1;
  const scopeOptions = (scope: Form["scope"]) => scope === "BRANCH" ? (o?.branches ?? []).map((b) => [b.id, b.branchName]) : scope === "DEPARTMENT" ? (o?.departments ?? []).map((d) => [d.id, d.departmentName]) : scope === "EMPLOYEE" ? (o?.people ?? []).map((p) => [p.id, `${p.employeeName} (${p.employeeCode})`]) : [];
  const edit = (r?: Rule) => { setError(""); setForm(r ? { id: r.id, level: String(r.level), approverType: r.approverType, approverEmployeeId: r.approverEmployeeId ?? "", approverDesignation: r.approverDesignation, scope: r.scope, scopeId: r.scopeEmployeeId ?? r.scopeDepartmentId ?? r.scopeBranchId ?? "", minAmount: r.minAmount ?? "", maxAmount: r.maxAmount ?? "" } : { level: String(next), approverType: "DEPARTMENT_HEAD", approverEmployeeId: "", approverDesignation: "", scope: "COMPANY", scopeId: "", minAmount: "", maxAmount: "" }); };
  const who = (r: Rule) => r.scope === "COMPANY" ? "Every employee" : `${r.scope === "EMPLOYEE" ? "Employee" : r.scope === "BRANCH" ? "Branch" : "Department"}: ${r.scopeName}`;
  const amount = (r: Rule) => r.minAmount && r.maxAmount ? `Trips ${inr(r.minAmount)} – ${inr(r.maxAmount)}` : r.minAmount ? `Trips above ${inr(r.minAmount)}` : r.maxAmount ? `Trips up to ${inr(r.maxAmount)}` : "Any amount";
  return <>
    <PageHeader title="Approval workflow" description="Who needs approval → who approves → in which order. When the travel policy requires approval, the request gets one step for every active step below that applies to that employee and amount.">
      <button className="rg-primary" disabled={next > 10} onClick={() => edit()}><Plus size={15}/>Add step</button>
    </PageHeader>
    {notice && <Notice tone="success">{notice}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="grid gap-6 xl:grid-cols-3">
      <Panel className="xl:col-span-2" title="Steps" description="Decided in order. A step whose approver is not set for the traveller (e.g. no department head) is routed to your corporate administrators.">
        {rules.length ? <ol className="space-y-3 p-5">{rules.map((r, i) => <li key={r.id} className={`rounded-xl border p-4 ${r.isActive ? "border-neutral-200" : "border-dashed border-neutral-300 opacity-70"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold">Step {i + 1}: {r.approverType === "SPECIFIC_EMPLOYEE" ? r.approverName ?? "Selected approver" : label(r.approverType)}</p>
                <p className="mt-1 text-sm text-neutral-600">{who(r)} · {amount(r)}</p>
                {r.approverDesignation && r.approverDesignation !== label(r.approverType) && <p className="mt-0.5 text-xs text-neutral-500">Shown as “{r.approverDesignation}”</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Status value={r.isActive ? "ACTIVE" : "INACTIVE"}/>
              <button className="rg-icon" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(r, "UP")}><ArrowUp size={15}/></button>
              <button className="rg-icon" aria-label="Move down" disabled={busy || i === rules.length - 1} onClick={() => move(r, "DOWN")}><ArrowDown size={15}/></button>
              <button className="rg-secondary" onClick={() => edit(r)}>Edit</button>
              <button className="rg-secondary" onClick={() => { setError(""); setToggle(r); }}>{r.isActive ? "Disable" : "Enable"}</button>
            </div>
          </div>
        </li>)}</ol> : <Empty>No approval steps configured. Each request then needs a single corporate administrator decision.</Empty>}
      </Panel>
      <Panel title="How requests are routed">
        <div className="space-y-3 p-5 text-sm text-neutral-600">
          <p className="flex items-center gap-2"><UserRound size={16}/>Employee request</p>
          {rules.filter((r) => r.isActive).map((r, i) => <p key={r.id} className="pl-6">→ Step {i + 1}: {r.approverType === "SPECIFIC_EMPLOYEE" ? r.approverName : label(r.approverType)}{r.scope !== "COMPANY" || r.minAmount || r.maxAmount ? <span className="text-xs text-neutral-500"> (only {who(r).toLowerCase()}{r.minAmount || r.maxAmount ? `, ${amount(r).toLowerCase()}` : ""})</span> : null}</p>)}
          <p className="pl-6">→ Approved: the employee books at a fresh price on corporate credit.</p>
          <p className="border-t border-neutral-100 pt-3">Rejecting any step ends the request. Assigned approvers are notified in the RideGrid app; corporate administrators can decide any step here.</p>
          <p className="text-xs text-neutral-500">Steps are copied onto each request when it is submitted; later changes apply to new requests only.</p>
        </div>
      </Panel>
    </div>}</DataState>
    <Modal wide open={!!form} title={form?.id ? "Edit approval step" : "Add approval step"} onClose={() => setForm(null)} footer={<><button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save step"}</button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who approves" hint={HELP[form.approverType]}><select className="rg-input" value={form.approverType} onChange={(e) => setForm({ ...form, approverType: e.target.value, approverEmployeeId: "" })}>{data?.approverTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        {form.approverType === "SPECIFIC_EMPLOYEE" ? <Field label="Approver"><select className="rg-input" value={form.approverEmployeeId} onChange={(e) => setForm({ ...form, approverEmployeeId: e.target.value })}><option value="">Choose a person…</option>{o?.people.map((p) => <option key={p.id} value={p.id}>{p.employeeName} · {p.designation}{p.hasLogin ? "" : " (no app login)"}</option>)}</select></Field> : <Field label="Display name (optional)" hint="e.g. “Finance head”. Defaults to the role."><input className="rg-input" maxLength={80} value={form.approverDesignation} onChange={(e) => setForm({ ...form, approverDesignation: e.target.value })}/></Field>}
        <Field label="Who needs this step"><select className="rg-input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Form["scope"], scopeId: "" })}><option value="COMPANY">Every employee</option><option value="BRANCH">Employees of one branch</option><option value="DEPARTMENT">Employees of one department</option><option value="EMPLOYEE">One employee</option></select></Field>
        {form.scope !== "COMPANY" ? <Field label={form.scope === "BRANCH" ? "Branch" : form.scope === "DEPARTMENT" ? "Department" : "Employee"}><select className="rg-input" value={form.scopeId} onChange={(e) => setForm({ ...form, scopeId: e.target.value })}><option value="">Choose…</option>{scopeOptions(form.scope).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field> : <div/>}
        <Field label="Only for trips above (₹)" hint="Empty = from ₹0."><input className="rg-input" inputMode="decimal" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })}/></Field>
        <Field label="Only for trips up to (₹)" hint="Empty = no upper limit."><input className="rg-input" inputMode="decimal" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}/></Field>
        {!form.id && <Field label="Position (1–10)" hint="New steps go last; reorder with the arrows."><input className="rg-input" inputMode="numeric" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}/></Field>}
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
    <Modal open={!!toggle} title={toggle?.isActive ? "Disable this step?" : "Enable this step?"} onClose={() => setToggle(null)} footer={<><button className="rg-secondary" onClick={() => setToggle(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={flip} disabled={busy}>Confirm</button></>}>
      <p className="text-sm text-neutral-600">New approval requests will {toggle?.isActive ? "skip" : "include"} this step. Requests already submitted are unchanged.</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
