"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmployeeRef } from "@/components/corporate-admin/types";
import { API, DataState, day, Empty, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit } from "@/components/corporate-admin/ui";

type Budget = { id: string; budgetName: string; period: string; status: string; allocatedAmount: string; utilizedAmount: string; alertThreshold: string | null; startDate: string; endDate: string; bookedSpend: string; remaining: string };
type Limit = { limit: string; used: string; remaining: string } | null;
type View = { budgets: Budget[]; employeeLimits: { employee: EmployeeRef | null; monthly: Limit; yearly: Limit }[] };
type Form = { id?: string; budgetName: string; period: string; allocatedAmount: string; startDate: string; endDate: string; alertThreshold: string; status?: string };
const PERIODS = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"];
const isoDay = (v: string) => new Date(v).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"><div className={`h-full ${pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${pct}%` }}/></div>;
}

export default function BudgetsPage() {
  const { data, loading, error, reload } = useAdminData<View>(`${API}/budgets`);
  const [form, setForm] = useState<Form | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  async function save() {
    if (!form) return;
    const body = form.id
      ? { action: "UPDATE", id: form.id, budgetName: form.budgetName, allocatedAmount: form.allocatedAmount, endDate: form.endDate, alertThreshold: form.alertThreshold || null, status: form.status }
      : { action: "CREATE", budgetName: form.budgetName, period: form.period, allocatedAmount: form.allocatedAmount, startDate: form.startDate, endDate: form.endDate, alertThreshold: form.alertThreshold || null };
    if (await run(() => send("budgets", body))) { setForm(null); void reload(); }
  }
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });
  return <>
    <PageHeader title="Budgets" description="Company travel budgets and each employee's personal travel limits. Spend is measured from central RideGrid bookings (non-cancelled, by pickup date).">
      <button className="rg-primary" onClick={() => { setError(""); setForm({ budgetName: "", period: "MONTHLY", allocatedAmount: "", startDate: "", endDate: "", alertThreshold: "80" }); }}><Plus size={15}/>New budget</button>
    </PageHeader>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <Panel title="Company budgets" description="Budgets are company-wide in RideGrid. Branch and department views are available in Reports.">
        {data.budgets.length ? <div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Budget</th><th>Period</th><th>Limit</th><th>Booked spend</th><th>Remaining</th><th>Status</th><th/></tr></thead>
          <tbody>{data.budgets.map((b) => <tr key={b.id}>
            <td className="min-w-48"><p className="font-semibold">{b.budgetName}</p><div className="mt-2"><Bar used={Number(b.bookedSpend)} limit={Number(b.allocatedAmount)}/></div>{b.alertThreshold && <p className="mt-1 text-xs text-neutral-500">Alert at {Number(b.alertThreshold)}%</p>}</td>
            <td className="whitespace-nowrap">{b.period.replaceAll("_", " ").toLowerCase()}<p className="text-xs text-neutral-500">{day(b.startDate)} – {day(b.endDate)}</p></td>
            <td className="whitespace-nowrap">{inr(b.allocatedAmount)}</td><td className="whitespace-nowrap">{inr(b.bookedSpend)}</td><td className="whitespace-nowrap font-medium">{inr(b.remaining)}</td>
            <td><Status value={b.status}/></td>
            <td className="text-right"><button className="rg-secondary" onClick={() => { setError(""); setForm({ id: b.id, budgetName: b.budgetName, period: b.period, allocatedAmount: b.allocatedAmount, startDate: isoDay(b.startDate), endDate: isoDay(b.endDate), alertThreshold: b.alertThreshold ?? "", status: b.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE" }); }}>Edit</button></td>
          </tr>)}</tbody>
        </table></div> : <Empty>No company budgets yet.</Empty>}
      </Panel>
      <Panel title="Employee travel limits" description="Set on each employee. The travel policy sends trips that would exceed a limit for approval. Employees see only their own limit in the app.">
        {data.employeeLimits.length ? <div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Employee</th><th>This month</th><th>This year</th></tr></thead>
          <tbody>{data.employeeLimits.map((r, i) => <tr key={r.employee?.id ?? i}>
            <td>{r.employee ? <Link className="font-semibold text-red-700" href={`/corporate-admin/employees/${r.employee.id}`}>{r.employee.name}</Link> : "—"}<p className="text-xs text-neutral-500">{r.employee?.department?.name ?? ""}</p></td>
            {[r.monthly, r.yearly].map((l, j) => <td key={j} className="min-w-44">{l ? <><p className="text-sm">{inr(l.used)} of {inr(l.limit)}</p><div className="mt-1"><Bar used={Number(l.used)} limit={Number(l.limit)}/></div><p className="mt-1 text-xs text-neutral-500">{inr(l.remaining)} left</p></> : <span className="text-neutral-400">No limit</span>}</td>)}
          </tr>)}</tbody>
        </table></div> : <Empty>No employee has a personal travel limit. Set limits from an employee&apos;s profile.</Empty>}
      </Panel>
    </>}</DataState>
    <Modal open={!!form} title={form?.id ? "Edit budget" : "New company budget"} onClose={() => setForm(null)} footer={<><button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save budget"}</button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Budget name" className="sm:col-span-2"><input className="rg-input" maxLength={120} value={form.budgetName} onChange={set("budgetName")}/></Field>
        <Field label="Period"><select className="rg-input" value={form.period} onChange={set("period")} disabled={!!form.id}>{PERIODS.map((p) => <option key={p} value={p}>{p.replaceAll("_", " ").toLowerCase()}</option>)}</select></Field>
        <Field label="Amount (₹)"><input className="rg-input" inputMode="decimal" value={form.allocatedAmount} onChange={set("allocatedAmount")}/></Field>
        <Field label="Start date"><input type="date" className="rg-input" value={form.startDate} onChange={set("startDate")} disabled={!!form.id}/></Field>
        <Field label="End date"><input type="date" className="rg-input" value={form.endDate} onChange={set("endDate")}/></Field>
        <Field label="Alert threshold (%)"><input className="rg-input" inputMode="decimal" value={form.alertThreshold} onChange={set("alertThreshold")}/></Field>
        {form.id && <Field label="Status"><select className="rg-input" value={form.status} onChange={set("status")}><option value="ACTIVE">Active</option><option value="SUSPENDED">Paused</option></select></Field>}
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
  </>;
}
