"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmployeeRef, OrgOptions } from "@/components/corporate-admin/types";
import { API, DataState, day, Empty, Field, inr, Modal, Notice, PageHeader, Panel, qs, send, Status, Tabs, useAdminData, useSubmit } from "@/components/corporate-admin/ui";

type Scope = "COMPANY" | "BRANCH" | "DEPARTMENT" | "EMPLOYEE";
type Budget = {
  id: string; budgetName: string; period: string; status: string; scope: Scope; scopeName: string; branchId: string | null; departmentId: string | null; employeeId: string | null;
  allocatedAmount: string; used: string; committed: string; pending: string; pendingRequests: number; remaining: string; utilisation: number;
  alertThreshold: string | null; alert: boolean; startDate: string; endDate: string;
};
type Limit = { limit: string; used: string; remaining: string } | null;
type View = { budgets: Budget[]; employeeLimits: { employee: EmployeeRef | null; monthly: Limit; yearly: Limit }[] };
type Form = { id?: string; budgetName: string; period: string; scope: Scope; scopeId: string; allocatedAmount: string; startDate: string; endDate: string; alertThreshold: string; status?: string };
const PERIODS = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"];
const isoDay = (v: string) => new Date(v).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const SCOPE_TEXT: Record<Scope, string> = { COMPANY: "Company", BRANCH: "Branch", DEPARTMENT: "Department", EMPLOYEE: "Employee" };

// Used (solid) and committed (lighter) against the allocation.
function Bar({ used, committed, limit }: { used: number; committed: number; limit: number }) {
  const u = limit > 0 ? Math.min(100, (used / limit) * 100) : 0, c = limit > 0 ? Math.min(100 - u, (committed / limit) * 100) : 0;
  return <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(u + c)}><div className={u + c >= 90 ? "bg-red-600" : "bg-neutral-800"} style={{ width: `${u}%` }}/><div className="bg-neutral-400" style={{ width: `${c}%` }}/></div>;
}

export default function BudgetsPage() {
  const [scope, setScope] = useState<Scope | "">("");
  const { data, loading, error, reload } = useAdminData<View>(`${API}/budgets${qs({ scope })}`);
  const { data: o } = useAdminData<OrgOptions>(`${API}/org-options`);
  const [form, setForm] = useState<Form | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  async function save() {
    if (!form) return;
    const body = form.id
      ? { action: "UPDATE", id: form.id, budgetName: form.budgetName, allocatedAmount: form.allocatedAmount, endDate: form.endDate, alertThreshold: form.alertThreshold || null, status: form.status }
      : { action: "CREATE", budgetName: form.budgetName, period: form.period, scope: form.scope, scopeId: form.scopeId || null, allocatedAmount: form.allocatedAmount, startDate: form.startDate, endDate: form.endDate, alertThreshold: form.alertThreshold || null };
    if (await run(() => send("budgets", body))) { setForm(null); void reload(); }
  }
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });
  const options = (s: Scope) => s === "BRANCH" ? (o?.branches ?? []).filter((b) => b.isActive).map((b) => [b.id, b.branchName]) : s === "DEPARTMENT" ? (o?.departments ?? []).filter((d) => d.isActive).map((d) => [d.id, d.departmentName]) : s === "EMPLOYEE" ? (o?.people ?? []).map((p) => [p.id, `${p.employeeName} (${p.employeeCode})`]) : [];
  return <>
    <PageHeader title="Budgets" description="Company → branch → department → employee budgets. Every corporate booking is checked against each budget that covers it; a trip that would exceed one goes to approval.">
      <button className="rg-primary" onClick={() => { setError(""); setForm({ budgetName: "", period: "MONTHLY", scope: scope || "COMPANY", scopeId: "", allocatedAmount: "", startDate: "", endDate: "", alertThreshold: "80" }); }}><Plus size={15}/>New budget</button>
    </PageHeader>
    <Panel title="Budgets" description="Used = completed trips · committed = booked, not yet completed · pending = approval requests awaiting a decision · remaining = allocated − used − committed.">
      <Tabs label="Budget level" value={scope} onChange={setScope} items={[{ value: "", label: "All levels" }, { value: "COMPANY", label: "Company" }, { value: "BRANCH", label: "Branch" }, { value: "DEPARTMENT", label: "Department" }, { value: "EMPLOYEE", label: "Employee" }]}/>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.budgets.length ? <div className="overflow-x-auto"><table className="rg-table">
        <thead><tr><th>Budget</th><th>Level</th><th>Period</th><th className="text-right">Allocated</th><th className="text-right">Used</th><th className="text-right">Committed</th><th className="text-right">Pending</th><th className="text-right">Remaining</th><th>Status</th><th/></tr></thead>
        <tbody>{data.budgets.map((b) => <tr key={b.id}>
          <td className="min-w-48"><p className="font-semibold">{b.budgetName}</p><div className="mt-2"><Bar used={Number(b.used)} committed={Number(b.committed)} limit={Number(b.allocatedAmount)}/></div><p className="mt-1 text-xs text-neutral-500">{b.utilisation}% used or committed{b.alertThreshold ? ` · alert at ${Number(b.alertThreshold)}%` : ""}</p></td>
          <td>{SCOPE_TEXT[b.scope]}<p className="text-xs text-neutral-500">{b.scope === "COMPANY" ? "" : b.scopeName}</p></td>
          <td className="whitespace-nowrap">{b.period.replaceAll("_", " ").toLowerCase()}<p className="text-xs text-neutral-500">{day(b.startDate)} – {day(b.endDate)}</p></td>
          <td className="whitespace-nowrap text-right">{inr(b.allocatedAmount)}</td><td className="whitespace-nowrap text-right">{inr(b.used)}</td><td className="whitespace-nowrap text-right">{inr(b.committed)}</td>
          <td className="whitespace-nowrap text-right">{inr(b.pending)}{b.pendingRequests ? <p className="text-xs text-neutral-500">{b.pendingRequests} request(s)</p> : null}</td>
          <td className="whitespace-nowrap text-right font-medium">{inr(b.remaining)}</td>
          <td><div className="flex flex-col items-start gap-1"><Status value={b.status}/>{b.alert && <Status value="Alert" tone="red"/>}</div></td>
          <td className="text-right"><button className="rg-secondary" onClick={() => { setError(""); setForm({ id: b.id, budgetName: b.budgetName, period: b.period, scope: b.scope, scopeId: "", allocatedAmount: b.allocatedAmount, startDate: isoDay(b.startDate), endDate: isoDay(b.endDate), alertThreshold: b.alertThreshold ?? "", status: b.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE" }); }}>Edit</button></td>
        </tr>)}</tbody>
      </table></div> : <Empty>No budgets at this level yet.</Empty>)}</DataState>
    </Panel>
    {data && <Panel title="Employee travel limits" description="Personal monthly and yearly limits set on each employee. Trips beyond a limit need approval. Employees see only their own limit in the app.">
      {data.employeeLimits.length ? <div className="overflow-x-auto"><table className="rg-table">
        <thead><tr><th>Employee</th><th>This month</th><th>This year</th></tr></thead>
        <tbody>{data.employeeLimits.map((r, i) => <tr key={r.employee?.id ?? i}>
          <td>{r.employee ? <Link className="font-semibold text-red-700" href={`/corporate-admin/employees/${r.employee.id}`}>{r.employee.name}</Link> : "—"}<p className="text-xs text-neutral-500">{r.employee?.department?.name ?? ""}</p></td>
          {[r.monthly, r.yearly].map((l, j) => <td key={j} className="min-w-44">{l ? <><p className="text-sm">{inr(l.used)} of {inr(l.limit)}</p><div className="mt-1"><Bar used={Number(l.used)} committed={0} limit={Number(l.limit)}/></div><p className="mt-1 text-xs text-neutral-500">{inr(l.remaining)} left</p></> : <span className="text-neutral-400">No limit</span>}</td>)}
        </tr>)}</tbody>
      </table></div> : <Empty>No employee has a personal travel limit. Set limits from an employee&apos;s profile.</Empty>}
    </Panel>}
    <Modal wide open={!!form} title={form?.id ? "Edit budget" : "New budget"} onClose={() => setForm(null)} footer={<><button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save budget"}</button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Budget name" className="sm:col-span-2"><input className="rg-input" maxLength={120} value={form.budgetName} onChange={set("budgetName")} placeholder="e.g. FY26 Q3 Sales travel"/></Field>
        <Field label="Level" hint={form.id ? "Fixed once created." : "Child budgets must fit inside the company (and branch/department) budget for the same dates."}><select className="rg-input" value={form.scope} disabled={!!form.id} onChange={(e) => setForm({ ...form, scope: e.target.value as Scope, scopeId: "" })}><option value="COMPANY">Company</option><option value="BRANCH">Branch</option><option value="DEPARTMENT">Department</option><option value="EMPLOYEE">Employee</option></select></Field>
        {form.scope !== "COMPANY" && !form.id ? <Field label={SCOPE_TEXT[form.scope]}><select className="rg-input" value={form.scopeId} onChange={set("scopeId")}><option value="">Choose…</option>{options(form.scope).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field> : <div/>}
        <Field label="Period"><select className="rg-input" value={form.period} onChange={set("period")} disabled={!!form.id}>{PERIODS.map((p) => <option key={p} value={p}>{p.replaceAll("_", " ").toLowerCase()}</option>)}</select></Field>
        <Field label="Allocated amount (₹)"><input className="rg-input" inputMode="decimal" value={form.allocatedAmount} onChange={set("allocatedAmount")}/></Field>
        <Field label="Start date"><input type="date" className="rg-input" value={form.startDate} onChange={set("startDate")} disabled={!!form.id}/></Field>
        <Field label="End date"><input type="date" className="rg-input" value={form.endDate} onChange={set("endDate")}/></Field>
        <Field label="Alert at (% used)" hint="Shown on this page and the dashboard."><input className="rg-input" inputMode="decimal" value={form.alertThreshold} onChange={set("alertThreshold")}/></Field>
        {form.id && <Field label="Status"><select className="rg-input" value={form.status} onChange={set("status")}><option value="ACTIVE">Active</option><option value="SUSPENDED">Paused (not enforced)</option></select></Field>}
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
  </>;
}
