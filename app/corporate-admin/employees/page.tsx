"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import EmployeeForm, { blankEmployee, EmployeeInput } from "@/components/corporate-admin/EmployeeForm";
import { EmployeeRef, Paged } from "@/components/corporate-admin/types";
import { API, DataState, Empty, inr, PageHeader, Pagination, Panel, qs, Status, useAdminData, useDebounced } from "@/components/corporate-admin/ui";

type Row = EmployeeRef & { email: string; mobile: string; isApprover: boolean; hasLogin: boolean; monthlyTravelLimit: string | null; yearlyTravelLimit: string | null };
type Options = { branches: { id: string; branchName: string }[]; departments: { id: string; departmentName: string }[] };

function Employees() {
  const params = useSearchParams();
  const [q, setQ] = useState(""), [branchId, setBranch] = useState(params.get("branchId") ?? ""), [departmentId, setDept] = useState(params.get("departmentId") ?? ""), [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const [editing, setEditing] = useState<EmployeeInput | null>(null);
  const query = useDebounced(q);
  const { data: o } = useAdminData<Options>(`${API}/org-options`);
  const { data, loading, error, reload } = useAdminData<Paged<Row>>(`${API}/employees${qs({ q: query, branchId, departmentId, status, page })}`);
  return <>
    <PageHeader title="Employees" description="Company employees who travel with RideGrid. Deactivating an employee blocks new bookings in the Corporate Employee app immediately.">
      <button className="rg-primary" onClick={() => setEditing({ ...blankEmployee })}><Plus size={15}/>Add employee</button>
    </PageHeader>
    <Panel title="Directory" action={<div className="flex flex-wrap gap-2">
      <label className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Search employees" placeholder="Name, code or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-44 bg-transparent text-sm outline-none"/></label>
      <select aria-label="Branch" className="rg-input w-auto" value={branchId} onChange={(e) => { setBranch(e.target.value); setPage(1); }}><option value="">All branches</option>{o?.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select>
      <select aria-label="Department" className="rg-input w-auto" value={departmentId} onChange={(e) => { setDept(e.target.value); setPage(1); }}><option value="">All departments</option>{o?.departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select>
      <select aria-label="Status" className="rg-input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
    </div>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <>
        <div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Employee</th><th>Contact</th><th>Branch / department</th><th>Travel limits</th><th>Access</th></tr></thead>
          <tbody>{data.items.map((e) => <tr key={e.id}>
            <td><Link className="font-semibold text-red-700" href={`/corporate-admin/employees/${e.id}`}>{e.name}</Link><p className="text-xs text-neutral-500">{e.code} · {e.designation}</p></td>
            <td><p className="truncate">{e.email}</p><p className="text-xs text-neutral-500">{e.mobile}</p></td>
            <td>{e.branch?.name ?? "—"}<p className="text-xs text-neutral-500">{e.department?.name ?? ""}</p></td>
            <td className="whitespace-nowrap">{e.monthlyTravelLimit ? `${inr(e.monthlyTravelLimit)}/mo` : "—"}<p className="text-xs text-neutral-500">{e.yearlyTravelLimit ? `${inr(e.yearlyTravelLimit)}/yr` : ""}</p></td>
            <td><div className="flex flex-wrap gap-1"><Status value={e.isActive ? "ACTIVE" : "INACTIVE"}/>{e.isApprover && <Status value="Approver" tone="blue"/>}{!e.hasLogin && <Status value="No app login" tone="gray"/>}</div></td>
          </tr>)}</tbody>
        </table></div>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/>
      </> : <Empty>No employees match these filters.</Empty>)}</DataState>
    </Panel>
    {editing && <EmployeeForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }}/>}
  </>;
}

export default function EmployeesPage() { return <Suspense><Employees/></Suspense>; }
