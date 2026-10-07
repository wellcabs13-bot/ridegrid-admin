"use client";
import { useState } from "react";
import { OrgOptions } from "./types";
import { API, Field, Modal, Notice, send, useAdminData, useSubmit } from "./ui";

export type EmployeeInput = {
  id?: string; employeeName: string; employeeCode: string; officialEmail: string; mobile: string; designation: string; employeeGrade: string;
  branchId: string; departmentId: string; costCenterId: string; reportingManagerId: string; approvalManagerId: string; travelPolicyId: string;
  monthlyTravelLimit: string; yearlyTravelLimit: string; defaultPickupAddress: string; emergencyContactName: string; emergencyContactMobile: string;
  isApprover: boolean; canBook: boolean;
};
export const blankEmployee: EmployeeInput = {
  employeeName: "", employeeCode: "", officialEmail: "", mobile: "", designation: "", employeeGrade: "", branchId: "", departmentId: "", costCenterId: "",
  reportingManagerId: "", approvalManagerId: "", travelPolicyId: "", monthlyTravelLimit: "", yearlyTravelLimit: "", defaultPickupAddress: "",
  emergencyContactName: "", emergencyContactMobile: "", isApprover: false, canBook: true,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="sm:col-span-2"><legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</legend><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

export default function EmployeeForm({ initial, onClose, onSaved }: { initial: EmployeeInput | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<EmployeeInput>(initial ?? blankEmployee);
  const { data: o } = useAdminData<OrgOptions>(initial ? `${API}/org-options` : null);
  const { busy, error, run } = useSubmit();
  const set = (k: keyof EmployeeInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const departments = (o?.departments ?? []).filter((d) => (d.isActive || d.id === v.departmentId) && (!v.branchId || !d.branchId || d.branchId === v.branchId));
  const managers = (o?.people ?? []).filter((p) => p.id !== v.id);
  const assigned = o?.policies.find((p) => p.id === v.travelPolicyId);
  const approver = managers.find((p) => p.id === (v.approvalManagerId || v.reportingManagerId));
  async function save() {
    const { id, ...fields } = v;
    const r = await run(() => send("employees", { action: id ? "UPDATE" : "CREATE", ...(id ? { id } : {}), ...fields }));
    if (r) onSaved();
  }
  const input = (k: keyof EmployeeInput, label: string, props: Record<string, unknown> = {}, hint?: string) =>
    <Field label={label} hint={hint}><input className="rg-input" value={String(v[k])} onChange={set(k)} {...props}/></Field>;
  const person = (k: "reportingManagerId" | "approvalManagerId", label: string, hint: string) =>
    <Field label={label} hint={hint}><select className="rg-input" value={v[k]} onChange={set(k)}><option value="">Not set</option>{managers.map((p) => <option key={p.id} value={p.id}>{p.employeeName} · {p.designation}</option>)}</select></Field>;
  return <Modal open={!!initial} wide title={v.id ? "Edit employee" : "Add employee"} onClose={onClose} footer={<>
    <button className="rg-secondary" onClick={onClose} disabled={busy}>Cancel</button>
    <button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save employee"}</button>
  </>}>
    <div className="grid gap-6 sm:grid-cols-2">
      <Section title="Identity">
        {input("employeeName", "Full name", { required: true, maxLength: 120 })}
        {input("employeeCode", "Employee ID", { required: true, maxLength: 40 })}
        {input("officialEmail", "Official email", { type: "email", required: true }, "Used as the Corporate Employee App login.")}
        {input("mobile", "Mobile", { type: "tel", required: true })}
        {input("designation", "Designation", { required: true, maxLength: 80 })}
        {input("employeeGrade", "Grade / band")}
      </Section>
      <Section title="Organisation">
        <Field label="Branch"><select className="rg-input" value={v.branchId} onChange={(e) => setV({ ...v, branchId: e.target.value, departmentId: "" })}><option value="">No branch</option>{o?.branches.filter((b) => b.isActive || b.id === v.branchId).map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
        <Field label="Department"><select className="rg-input" value={v.departmentId} onChange={set("departmentId")}><option value="">No department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select></Field>
        {person("reportingManagerId", "Reporting manager", "Used by workflow steps set to “Reporting manager”.")}
        {person("approvalManagerId", "Approval manager", "Used by steps set to “Approval manager”, if different.")}
        {(o?.costCenters.length ?? 0) > 0 && <Field label="Cost center"><select className="rg-input" value={v.costCenterId} onChange={set("costCenterId")}><option value="">No cost center</option>{o?.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></Field>}
      </Section>
      <Section title="Travel">
        <Field label="Assigned travel policy" hint="Empty uses the department, branch or company policy."><select className="rg-input" value={v.travelPolicyId} onChange={set("travelPolicyId")}><option value="">Automatic (department / branch / company)</option>{o?.policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}</select></Field>
        {input("defaultPickupAddress", "Default pickup address")}
        <Field label="Monthly travel limit (₹)" hint="Empty means no personal monthly limit."><input className="rg-input" inputMode="decimal" value={v.monthlyTravelLimit} onChange={set("monthlyTravelLimit")}/></Field>
        <Field label="Yearly travel limit (₹)" hint="Trips above a limit need approval."><input className="rg-input" inputMode="decimal" value={v.yearlyTravelLimit} onChange={set("yearlyTravelLimit")}/></Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={v.canBook} onChange={(e) => setV({ ...v, canBook: e.target.checked })}/><span>Can book rides<span className="block text-xs text-neutral-500">Turn off for approvers who do not travel.</span></span></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={v.isApprover} onChange={(e) => setV({ ...v, isApprover: e.target.checked })}/><span>Company approver<span className="block text-xs text-neutral-500">Marks this person as someone who approves travel.</span></span></label>
      </Section>
      <Section title="Booking approval">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[13px] sm:col-span-2">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {assigned
              ? assigned.approvalRequired
                ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11.5px] text-amber-800">Approval required</span>
                : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11.5px] text-emerald-800">Auto-approved</span>
              : <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11.5px] text-neutral-700">Follows department, branch or company policy</span>}
            {assigned && <span className="font-normal text-neutral-600">by the “{assigned.policyName}” travel policy</span>}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
            <li>Whether this employee&apos;s rides need approval is set by their travel policy. Choose a policy above, or edit policies under Travel policy.</li>
            <li>{approver ? <>When approval is needed, it goes to <b>{approver.employeeName}</b> ({v.approvalManagerId ? "approval manager" : "reporting manager"}) first, following your approval workflow.</> : <>No approval manager is set, so approval follows your company approval workflow. Corporate administrators can always decide.</>}</li>
            <li>A ride outside policy (limits, budgets, hours, categories) always needs approval, even for an auto-approved employee. Rides you book for them from New booking are authorised by you unless the policy sends them to someone else.</li>
          </ul>
        </div>
      </Section>
      <Section title="Emergency contact">
        {input("emergencyContactName", "Name")}
        {input("emergencyContactMobile", "Mobile", { type: "tel" })}
      </Section>
    </div>
    {!v.id && <p className="mt-4 text-xs text-neutral-500">The employee is added to your company. Create their Corporate Employee App login from their profile once saved; the official email and mobile must not already belong to another RideGrid account.</p>}
    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
  </Modal>;
}
