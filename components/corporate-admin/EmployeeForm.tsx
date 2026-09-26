"use client";
import { useState } from "react";
import { API, Field, Modal, Notice, send, useAdminData, useSubmit } from "./ui";

type Options = { branches: { id: string; branchName: string }[]; departments: { id: string; departmentName: string; branchId: string | null }[]; costCenters: { id: string; name: string; code: string }[] };
export type EmployeeInput = {
  id?: string; employeeName: string; employeeCode: string; officialEmail: string; mobile: string; designation: string; employeeGrade: string;
  managerName: string; managerEmail: string; branchId: string; departmentId: string; costCenterId: string; monthlyTravelLimit: string; yearlyTravelLimit: string;
  defaultPickupAddress: string; emergencyContactName: string; emergencyContactMobile: string; isApprover: boolean;
};
export const blankEmployee: EmployeeInput = { employeeName: "", employeeCode: "", officialEmail: "", mobile: "", designation: "", employeeGrade: "", managerName: "", managerEmail: "", branchId: "", departmentId: "", costCenterId: "", monthlyTravelLimit: "", yearlyTravelLimit: "", defaultPickupAddress: "", emergencyContactName: "", emergencyContactMobile: "", isApprover: false };

export default function EmployeeForm({ initial, onClose, onSaved }: { initial: EmployeeInput | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<EmployeeInput>(initial ?? blankEmployee);
  const { data: o } = useAdminData<Options>(initial ? `${API}/org-options` : null);
  const { busy, error, run } = useSubmit();
  const set = (k: keyof EmployeeInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const departments = (o?.departments ?? []).filter((d) => !v.branchId || !d.branchId || d.branchId === v.branchId);
  async function save() {
    const { id, ...fields } = v;
    const r = await run(() => send("employees", { action: id ? "UPDATE" : "CREATE", ...(id ? { id } : {}), ...fields }));
    if (r) onSaved();
  }
  const input = (k: keyof EmployeeInput, label: string, props: Record<string, unknown> = {}) =>
    <Field label={label}><input className="rg-input" value={String(v[k])} onChange={set(k)} {...props}/></Field>;
  return <Modal open={!!initial} wide title={v.id ? "Edit employee" : "Add employee"} onClose={onClose} footer={<>
    <button className="rg-secondary" onClick={onClose} disabled={busy}>Cancel</button>
    <button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save employee"}</button>
  </>}>
    <div className="grid gap-4 sm:grid-cols-2">
      {input("employeeName", "Full name", { required: true, maxLength: 120 })}
      {input("employeeCode", "Employee code", { required: true, maxLength: 40 })}
      {input("officialEmail", "Official email", { type: "email", required: true })}
      {input("mobile", "Mobile", { type: "tel", required: true })}
      {input("designation", "Designation", { required: true, maxLength: 80 })}
      {input("employeeGrade", "Grade")}
      <Field label="Branch"><select className="rg-input" value={v.branchId} onChange={(e) => setV({ ...v, branchId: e.target.value, departmentId: "" })}><option value="">No branch</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
      <Field label="Department"><select className="rg-input" value={v.departmentId} onChange={set("departmentId")}><option value="">No department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select></Field>
      <Field label="Cost center"><select className="rg-input" value={v.costCenterId} onChange={set("costCenterId")}><option value="">No cost center</option>{o?.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></Field>
      {input("managerName", "Manager name")}
      {input("managerEmail", "Manager email", { type: "email" })}
      {input("defaultPickupAddress", "Default pickup address")}
      <Field label="Monthly travel limit (₹)" hint="Empty means no personal monthly limit."><input className="rg-input" inputMode="decimal" value={v.monthlyTravelLimit} onChange={set("monthlyTravelLimit")}/></Field>
      <Field label="Yearly travel limit (₹)" hint="Trips above a limit need approval."><input className="rg-input" inputMode="decimal" value={v.yearlyTravelLimit} onChange={set("yearlyTravelLimit")}/></Field>
      {input("emergencyContactName", "Emergency contact")}
      {input("emergencyContactMobile", "Emergency contact mobile", { type: "tel" })}
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={v.isApprover} onChange={(e) => setV({ ...v, isApprover: e.target.checked })}/>Mark as a company approver</label>
    </div>
    {!v.id && <p className="mt-4 text-xs text-neutral-500">Adding an employee records them for travel administration. RideGrid provisions the employee&apos;s app login; no invitation email is sent from this portal.</p>}
    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
  </Modal>;
}
