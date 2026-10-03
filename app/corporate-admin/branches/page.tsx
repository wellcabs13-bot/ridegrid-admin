"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { API, DataState, Empty, Field, Modal, Notice, PageHeader, Panel, qs, send, Status, useAdminData, useDebounced, useSubmit } from "@/components/corporate-admin/ui";

type Branch = {
  id: string; branchName: string; branchCode: string | null; address: string; city: string | null; state: string; pincode: string; isHeadOffice: boolean; isActive: boolean;
  contactName: string | null; contactPhone: string | null; contactEmail: string | null; gstNumber: string | null;
  employeeCount: number; departmentCount: number; policyCount: number; budgetCount: number;
};
type Form = { id?: string; branchName: string; branchCode: string; address: string; city: string; state: string; pincode: string; isHeadOffice: boolean; contactName: string; contactPhone: string; contactEmail: string; gstNumber: string };
const blank: Form = { branchName: "", branchCode: "", address: "", city: "", state: "", pincode: "", isHeadOffice: false, contactName: "", contactPhone: "", contactEmail: "", gstNumber: "" };

export default function BranchesPage() {
  const [q, setQ] = useState("");
  const query = useDebounced(q);
  const [form, setForm] = useState<Form | null>(null);
  const [toggle, setToggle] = useState<Branch | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  const { data, loading, error, reload } = useAdminData<{ items: Branch[] }>(`${API}/branches${qs({ q: query })}`);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });
  async function save() {
    if (!form) return;
    const { id, ...fields } = form;
    if (await run(() => send("branches", { action: id ? "UPDATE" : "CREATE", ...(id ? { id } : {}), ...fields }))) { setForm(null); void reload(); }
  }
  async function flip() {
    if (toggle && await run(() => send("branches", { action: "SET_ACTIVE", id: toggle.id, isActive: !toggle.isActive }))) { setToggle(null); void reload(); }
  }
  const s = (v: string | null) => v ?? "";
  return <>
    <PageHeader title="Branches" description="Your office locations. Departments, employees, travel policies, budgets, bookings, billing and reports can all be organised by branch.">
      <button className="rg-primary" onClick={() => { setError(""); setForm({ ...blank }); }}><Plus size={15}/>Add branch</button>
    </PageHeader>
    <Panel title="Company branches" action={<label className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Search branches" placeholder="Name, code or city…" value={q} onChange={(e) => setQ(e.target.value)} className="w-44 bg-transparent text-sm outline-none"/></label>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <div className="overflow-x-auto"><table className="rg-table">
        <thead><tr><th>Branch</th><th>Address</th><th>Contact</th><th>Linked records</th><th>Status</th><th/></tr></thead>
        <tbody>{data.items.map((b) => <tr key={b.id}>
          <td><p className="font-semibold">{b.branchName}</p><div className="mt-1 flex flex-wrap gap-1">{b.branchCode && <span className="text-xs text-neutral-500">{b.branchCode}</span>}{b.isHeadOffice && <Status value="Head office" tone="blue"/>}</div>{b.gstNumber && <p className="mt-1 text-xs text-neutral-500">GSTIN {b.gstNumber}</p>}</td>
          <td><p className="max-w-64 truncate">{b.address}</p><p className="text-xs text-neutral-500">{[b.city, b.state, b.pincode].filter(Boolean).join(", ")}</p></td>
          <td><p>{b.contactName ?? "—"}</p><p className="text-xs text-neutral-500">{[b.contactPhone, b.contactEmail].filter(Boolean).join(" · ")}</p></td>
          <td className="whitespace-nowrap text-xs"><Link className="font-medium text-red-700" href={`/corporate-admin/employees?branchId=${b.id}`}>{b.employeeCount} employees</Link><p className="text-neutral-500">{b.departmentCount} departments · {b.policyCount} policies · {b.budgetCount} budgets</p></td>
          <td><Status value={b.isActive ? "ACTIVE" : "INACTIVE"}/></td>
          <td className="whitespace-nowrap text-right"><button className="rg-secondary mr-2" onClick={() => { setError(""); setForm({ id: b.id, branchName: b.branchName, branchCode: s(b.branchCode), address: b.address, city: s(b.city), state: b.state, pincode: b.pincode, isHeadOffice: b.isHeadOffice, contactName: s(b.contactName), contactPhone: s(b.contactPhone), contactEmail: s(b.contactEmail), gstNumber: s(b.gstNumber) }); }}>Edit</button><button className="rg-secondary" onClick={() => { setError(""); setToggle(b); }}>{b.isActive ? "Deactivate" : "Activate"}</button></td>
        </tr>)}</tbody>
      </table></div> : <Empty>No branches yet. Add your offices to organise employees, budgets and reports.</Empty>)}</DataState>
    </Panel>
    <Modal wide open={!!form} title={form?.id ? "Edit branch" : "Add branch"} onClose={() => setForm(null)} footer={<>
      <button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save branch"}</button>
    </>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch name"><input className="rg-input" value={form.branchName} onChange={set("branchName")} maxLength={120}/></Field>
        <Field label="Branch code" hint="Optional short code, e.g. PNQ-01."><input className="rg-input" value={form.branchCode} onChange={set("branchCode")} maxLength={40}/></Field>
        <Field label="Address" className="sm:col-span-2"><input className="rg-input" value={form.address} onChange={set("address")} maxLength={300}/></Field>
        <Field label="City"><input className="rg-input" value={form.city} onChange={set("city")}/></Field>
        <Field label="State"><input className="rg-input" value={form.state} onChange={set("state")}/></Field>
        <Field label="Postal code"><input className="rg-input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")}/></Field>
        <Field label="Branch GSTIN" hint="Only if this branch is separately GST-registered."><input className="rg-input uppercase" maxLength={15} value={form.gstNumber} onChange={set("gstNumber")}/></Field>
        <Field label="Main contact person"><input className="rg-input" value={form.contactName} onChange={set("contactName")} maxLength={120}/></Field>
        <Field label="Contact phone"><input className="rg-input" type="tel" value={form.contactPhone} onChange={set("contactPhone")}/></Field>
        <Field label="Contact email"><input className="rg-input" type="email" value={form.contactEmail} onChange={set("contactEmail")}/></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.isHeadOffice} onChange={(e) => setForm({ ...form, isHeadOffice: e.target.checked })}/>Head office</label>
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
    <Modal open={!!toggle} title={toggle?.isActive ? "Deactivate branch?" : "Activate branch?"} onClose={() => setToggle(null)} footer={<><button className="rg-secondary" onClick={() => setToggle(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={flip} disabled={busy}>Confirm</button></>}>
      <p className="text-sm text-neutral-600">{toggle?.isActive ? "New employees, departments, policies and budgets can no longer be assigned to this branch. Existing employees, bookings and history are unchanged." : "The branch can be used for new assignments again."}</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
