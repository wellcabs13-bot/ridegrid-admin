"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { OrgOptions } from "@/components/corporate-admin/types";
import { API, DataState, Empty, Field, Modal, Notice, PageHeader, Panel, qs, send, Status, useAdminData, useDebounced, useSubmit } from "@/components/corporate-admin/ui";

type Department = {
  id: string; departmentName: string; departmentCode: string | null; branchId: string | null; isActive: boolean; branch: { branchName: string } | null;
  headEmployeeId: string | null; approverEmployeeId: string | null; head: string | null; approver: string | null; employeeCount: number; policyCount: number; budgetCount: number;
};
type Form = { id?: string; departmentName: string; departmentCode: string; branchId: string; headEmployeeId: string; approverEmployeeId: string };

export default function DepartmentsPage() {
  const [q, setQ] = useState(""), [branchId, setBranch] = useState("");
  const query = useDebounced(q);
  const [form, setForm] = useState<Form | null>(null);
  const [toggle, setToggle] = useState<Department | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  const { data: o } = useAdminData<OrgOptions>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<{ items: Department[] }>(`${API}/departments${qs({ q: query, branchId })}`);
  async function save() {
    if (!form) return;
    const { id, ...fields } = form;
    if (await run(() => send("departments", { action: id ? "UPDATE" : "CREATE", ...(id ? { id } : {}), ...fields }))) { setForm(null); void reload(); }
  }
  async function flip() {
    if (toggle && await run(() => send("departments", { action: "SET_ACTIVE", id: toggle.id, isActive: !toggle.isActive }))) { setToggle(null); void reload(); }
  }
  const people = (o?.people ?? []).filter((p) => !form?.branchId || !p.branchId || p.branchId === form.branchId);
  const person = (k: "headEmployeeId" | "approverEmployeeId", label: string, hint: string) => form && <Field label={label} hint={hint}><select className="rg-input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}><option value="">Not set</option>{people.map((p) => <option key={p.id} value={p.id}>{p.employeeName} · {p.designation}{p.hasLogin ? "" : " (no app login)"}</option>)}</select></Field>;
  return <>
    <PageHeader title="Departments" description="Company → Branch → Department → Employee. The department head and approver can be used as approvers in your approval workflow.">
      <button className="rg-primary" onClick={() => { setError(""); setForm({ departmentName: "", departmentCode: "", branchId: "", headEmployeeId: "", approverEmployeeId: "" }); }}><Plus size={15}/>Add department</button>
    </PageHeader>
    <Panel title="Company departments" action={<div className="flex flex-wrap gap-2">
      <label className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Search departments" placeholder="Name or code…" value={q} onChange={(e) => setQ(e.target.value)} className="w-40 bg-transparent text-sm outline-none"/></label>
      <select aria-label="Branch" className="rg-input w-auto" value={branchId} onChange={(e) => setBranch(e.target.value)}><option value="">All branches</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select>
    </div>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <div className="overflow-x-auto"><table className="rg-table">
        <thead><tr><th>Department</th><th>Branch</th><th>Head / approver</th><th>Linked records</th><th>Status</th><th/></tr></thead>
        <tbody>{data.items.map((d) => <tr key={d.id}>
          <td><p className="font-semibold">{d.departmentName}</p>{d.departmentCode && <p className="text-xs text-neutral-500">{d.departmentCode}</p>}</td>
          <td>{d.branch?.branchName ?? "Company-wide"}</td>
          <td><p>{d.head ?? <span className="text-neutral-400">No head</span>}</p><p className="text-xs text-neutral-500">{d.approver ? `Approver: ${d.approver}` : "No separate approver"}</p></td>
          <td className="whitespace-nowrap text-xs"><Link className="font-medium text-red-700" href={`/corporate-admin/employees?departmentId=${d.id}`}>{d.employeeCount} employees</Link><p className="text-neutral-500">{d.policyCount} policies · {d.budgetCount} budgets</p></td>
          <td><Status value={d.isActive ? "ACTIVE" : "INACTIVE"}/></td>
          <td className="whitespace-nowrap text-right"><button className="rg-secondary mr-2" onClick={() => { setError(""); setForm({ id: d.id, departmentName: d.departmentName, departmentCode: d.departmentCode ?? "", branchId: d.branchId ?? "", headEmployeeId: d.headEmployeeId ?? "", approverEmployeeId: d.approverEmployeeId ?? "" }); }}>Edit</button><button className="rg-secondary" onClick={() => { setError(""); setToggle(d); }}>{d.isActive ? "Deactivate" : "Activate"}</button></td>
        </tr>)}</tbody>
      </table></div> : <Empty>No departments yet.</Empty>)}</DataState>
    </Panel>
    <Modal wide open={!!form} title={form?.id ? "Edit department" : "Add department"} onClose={() => setForm(null)} footer={<>
      <button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save department"}</button>
    </>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department name"><input className="rg-input" value={form.departmentName} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} maxLength={120}/></Field>
        <Field label="Department code"><input className="rg-input" value={form.departmentCode} onChange={(e) => setForm({ ...form, departmentCode: e.target.value })} maxLength={40}/></Field>
        <Field label="Branch" hint="Leave as company-wide if the department spans branches." className="sm:col-span-2"><select className="rg-input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">Company-wide</option>{o?.branches.filter((b) => b.isActive || b.id === form.branchId).map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
        {person("headEmployeeId", "Department head", "Used by workflow steps set to “Department head”.")}
        {person("approverEmployeeId", "Department approver / manager", "Optional; used by steps set to “Department approver”.")}
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
    <Modal open={!!toggle} title={toggle?.isActive ? "Deactivate department?" : "Activate department?"} onClose={() => setToggle(null)} footer={<><button className="rg-secondary" onClick={() => setToggle(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={flip} disabled={busy}>Confirm</button></>}>
      <p className="text-sm text-neutral-600">{toggle?.isActive ? "Employees, policies and budgets can no longer be newly assigned to this department. Existing records are unchanged." : "The department can be used for new assignments again."}</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
