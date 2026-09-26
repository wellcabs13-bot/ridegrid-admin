"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { API, DataState, Empty, Field, Modal, Notice, PageHeader, Panel, qs, send, useAdminData, useDebounced, useSubmit } from "@/components/corporate-admin/ui";

type Department = { id: string; departmentName: string; departmentCode: string | null; branchId: string | null; branch: { branchName: string } | null; employeeCount: number };
type Form = { id?: string; departmentName: string; departmentCode: string; branchId: string };

export default function DepartmentsPage() {
  const [q, setQ] = useState(""), [branchId, setBranch] = useState("");
  const query = useDebounced(q);
  const [form, setForm] = useState<Form | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  const { data: o } = useAdminData<{ branches: { id: string; branchName: string }[] }>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<{ items: Department[] }>(`${API}/departments${qs({ q: query, branchId })}`);
  async function save() {
    if (!form) return;
    const { id, ...fields } = form;
    if (await run(() => send("departments", { action: id ? "UPDATE" : "CREATE", ...(id ? { id } : {}), ...fields }))) { setForm(null); void reload(); }
  }
  return <>
    <PageHeader title="Departments" description="Departments group employees for filtering, budgets and reports. A department can belong to one branch or span the company.">
      <button className="rg-primary" onClick={() => { setError(""); setForm({ departmentName: "", departmentCode: "", branchId: "" }); }}><Plus size={15}/>Add department</button>
    </PageHeader>
    <Panel title="Company departments" action={<div className="flex flex-wrap gap-2">
      <label className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Search departments" placeholder="Name or code…" value={q} onChange={(e) => setQ(e.target.value)} className="w-40 bg-transparent text-sm outline-none"/></label>
      <select aria-label="Branch" className="rg-input w-auto" value={branchId} onChange={(e) => setBranch(e.target.value)}><option value="">All branches</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select>
    </div>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <div className="overflow-x-auto"><table className="rg-table">
        <thead><tr><th>Department</th><th>Branch</th><th>Employees</th><th/></tr></thead>
        <tbody>{data.items.map((d) => <tr key={d.id}>
          <td><p className="font-semibold">{d.departmentName}</p>{d.departmentCode && <p className="text-xs text-neutral-500">{d.departmentCode}</p>}</td>
          <td>{d.branch?.branchName ?? "Company-wide"}</td>
          <td><Link className="font-medium text-red-700" href={`/corporate-admin/employees?departmentId=${d.id}`}>{d.employeeCount}</Link></td>
          <td className="text-right"><button className="rg-secondary" onClick={() => { setError(""); setForm({ id: d.id, departmentName: d.departmentName, departmentCode: d.departmentCode ?? "", branchId: d.branchId ?? "" }); }}>Edit</button></td>
        </tr>)}</tbody>
      </table></div> : <Empty>No departments yet.</Empty>)}</DataState>
    </Panel>
    <Modal open={!!form} title={form?.id ? "Edit department" : "Add department"} onClose={() => setForm(null)} footer={<>
      <button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save department"}</button>
    </>}>
      {form && <div className="space-y-4">
        <Field label="Department name"><input className="rg-input" value={form.departmentName} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} maxLength={120}/></Field>
        <Field label="Department code"><input className="rg-input" value={form.departmentCode} onChange={(e) => setForm({ ...form, departmentCode: e.target.value })} maxLength={40}/></Field>
        <Field label="Branch" hint="Only your company's branches are available."><select className="rg-input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">Company-wide</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
        {saveError && <Notice tone="error">{saveError}</Notice>}
      </div>}
    </Modal>
  </>;
}
