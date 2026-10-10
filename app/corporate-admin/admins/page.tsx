"use client";
import Link from "next/link";
import { EmployeeRef } from "@/components/corporate-admin/types";
import { API, DataState, Empty, inr, PageHeader, Panel, Status, useAdminData } from "@/components/corporate-admin/ui";

type View = {
  admins: { userId: string; name: string; email: string; active: boolean; employeeId: string | null; designation: string | null; isSelf: boolean }[];
  approvers: (EmployeeRef & { email: string })[];
  stages: { level: number; approverDesignation: string; maxAmount: string | null }[];
};

export default function AdminsPage() {
  const { data, loading, error, reload } = useAdminData<View>(`${API}/admins`);
  return <>
    <PageHeader title="Admins and approvers" description="Who manages travel for your company. Company administrator accounts are created and removed by RideGrid support; approver designations are managed on each employee's profile."/>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Company administrators" description="Can approve requests and manage employees, policy, workflow and budgets.">
        {data.admins.length ? <ul className="divide-y divide-neutral-100">{data.admins.map((a) => <li key={a.userId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span><span className="font-medium">{a.name}</span>{a.isSelf && <span className="text-neutral-500"> (you)</span>}<span className="block text-xs text-neutral-500">{a.email}{a.designation ? ` · ${a.designation}` : ""}</span></span><Status value={a.active ? "ACTIVE" : "INACTIVE"}/></li>)}</ul> : <Empty>No administrators found.</Empty>}
      </Panel>
      <Panel title="Designated approvers" description="Employees flagged as approvers.">
        {data.approvers.length ? <ul className="divide-y divide-neutral-100">{data.approvers.map((e) => <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm"><span><Link className="font-medium text-red-700" href={`/corporate-admin/employees/${e.id}`}>{e.name}</Link><span className="block text-xs text-neutral-500">{e.designation}{e.department ? ` · ${e.department.name}` : ""}</span></span><Status value={e.isActive ? "ACTIVE" : "INACTIVE"}/></li>)}</ul> : <Empty>No employees are flagged as approvers.</Empty>}
      </Panel>
      <Panel className="xl:col-span-2" title="Approval roles in your workflow" action={<Link className="text-sm font-semibold text-red-700" href="/corporate-admin/workflow">Edit workflow</Link>}>
        {data.stages.length ? <ol className="divide-y divide-neutral-100">{data.stages.map((s) => <li key={s.level} className="flex justify-between px-5 py-3 text-sm"><span>Level {s.level} · {s.approverDesignation}</span><span className="text-neutral-500">{s.maxAmount ? `up to ${inr(s.maxAmount)}` : "any amount"}</span></li>)}</ol> : <Empty>No approval steps configured; a company administrator decides each request.</Empty>}
      </Panel>
    </div>}</DataState>
  </>;
}
