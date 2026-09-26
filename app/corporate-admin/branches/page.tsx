"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { API, DataState, Empty, Field, Modal, Notice, PageHeader, Panel, qs, send, Status, useAdminData, useDebounced, useSubmit } from "@/components/corporate-admin/ui";

type Branch = { id: string; branchName: string; branchCode: string | null; address: string; city: string | null; state: string; pincode: string; isHeadOffice: boolean; employeeCount: number; departmentCount: number };
type Form = { id?: string; branchName: string; branchCode: string; address: string; city: string; state: string; pincode: string; isHeadOffice: boolean };
const blank: Form = { branchName: "", branchCode: "", address: "", city: "", state: "", pincode: "", isHeadOffice: false };

export default function BranchesPage() {
  const [q, setQ] = useState("");
  const query = useDebounced(q);
  const [form, setForm] = useState<Form | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  const { data, loading, error, reload } = useAdminData<{ items: Branch[] }>(`${API}/branches${qs({ q: query })}`);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });
  async function save() {
    if (!form) return;
    const { id, ...fields } = form;
    if (await run(() => send("branches", { action: id ? "UPDATE" : "CREATE", ...(id ? { id } : {}), ...fields }))) { setForm(null); void reload(); }
  }
  return <>
    <PageHeader title="Branches" description="Office locations used to group employees, departments and reports.">
      <button className="rg-primary" onClick={() => { setError(""); setForm({ ...blank }); }}><Plus size={15}/>Add branch</button>
    </PageHeader>
    <Panel title="Company branches" description="Branches have no separate status in RideGrid; employees carry their own active status." action={<label className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Search branches" placeholder="Name, code or city…" value={q} onChange={(e) => setQ(e.target.value)} className="w-44 bg-transparent text-sm outline-none"/></label>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <div className="overflow-x-auto"><table className="rg-table">
        <thead><tr><th>Branch</th><th>Address</th><th>Employees</th><th>Departments</th><th/></tr></thead>
        <tbody>{data.items.map((b) => <tr key={b.id}>
          <td><p className="font-semibold">{b.branchName}</p><div className="mt-1 flex gap-1">{b.branchCode && <span className="text-xs text-neutral-500">{b.branchCode}</span>}{b.isHeadOffice && <Status value="Head office" tone="blue"/>}</div></td>
          <td><p className="max-w-72 truncate">{b.address}</p><p className="text-xs text-neutral-500">{[b.city, b.state, b.pincode].filter(Boolean).join(", ")}</p></td>
          <td><Link className="font-medium text-red-700" href={`/corporate-admin/employees?branchId=${b.id}`}>{b.employeeCount}</Link></td>
          <td>{b.departmentCount}</td>
          <td className="text-right"><button className="rg-secondary" onClick={() => { setError(""); setForm({ id: b.id, branchName: b.branchName, branchCode: b.branchCode ?? "", address: b.address, city: b.city ?? "", state: b.state, pincode: b.pincode, isHeadOffice: b.isHeadOffice }); }}>Edit</button></td>
        </tr>)}</tbody>
      </table></div> : <Empty>No branches yet. Add your offices to organise employees and reports.</Empty>)}</DataState>
    </Panel>
    <Modal open={!!form} title={form?.id ? "Edit branch" : "Add branch"} onClose={() => setForm(null)} footer={<>
      <button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save branch"}</button>
    </>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch name"><input className="rg-input" value={form.branchName} onChange={set("branchName")} maxLength={120}/></Field>
        <Field label="Branch code"><input className="rg-input" value={form.branchCode} onChange={set("branchCode")} maxLength={40}/></Field>
        <Field label="Address" className="sm:col-span-2"><input className="rg-input" value={form.address} onChange={set("address")} maxLength={300}/></Field>
        <Field label="City"><input className="rg-input" value={form.city} onChange={set("city")}/></Field>
        <Field label="State"><input className="rg-input" value={form.state} onChange={set("state")}/></Field>
        <Field label="Pincode"><input className="rg-input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")}/></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.isHeadOffice} onChange={(e) => setForm({ ...form, isHeadOffice: e.target.checked })}/>Head office</label>
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
  </>;
}
