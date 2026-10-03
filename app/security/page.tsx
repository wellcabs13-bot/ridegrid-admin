"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Empty, Field, Kpi, Pager, Section, num, when, words } from "@/components/admin/kit";

type View = {
  usersByRole: { role: string; active: number; suspended: number; deleted: number }[];
  rbac: { role: string; permissions: string[] }[];
  signals: { failedLogins30d: number; loginsRecorded30d: number; activeRefreshSessions: number; deletions30d: number };
  audit: { rows: { id: string; action: string; entityName: string; entityId: string | null; newValue: Record<string, unknown> | null; ipAddress: string | null; createdAt: string; user: { name: string; role: string } | null }[]; total: number; page: number; totalPages: number; entities: string[] };
};

export default function SecurityPage() {
  const [entity, setEntity] = useState(""); const [action, setAction] = useState(""); const [page, setPage] = useState(1);
  const url = useMemo(() => `/api/admin/platform?view=security&${new URLSearchParams(Object.fromEntries(Object.entries({ entity, action, page: String(page) }).filter(([, v]) => v)) as Record<string, string>)}`, [entity, action, page]);
  const { data, loading, error, reload } = useAdminData<View>(url);
  const allPermissions = data ? [...new Set(data.rbac.flatMap(r => r.permissions))] : [];
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Security" description="Accounts by role, the enforced role permissions, and the audit trail of sensitive actions. Secrets, password hashes and provider keys are never shown."><button className="rg-secondary" onClick={reload} disabled={loading}>Refresh</button></PageHeading>
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Active sign-in sessions" value={num(data.signals.activeRefreshSessions)} hint="Unrevoked, unexpired refresh tokens" />
        <Kpi label="Failed logins (30 days)" value={num(data.signals.failedLogins30d)} hint="As recorded in security events" tone={data.signals.failedLogins30d ? "warn" : undefined} />
        <Kpi label="Logins recorded (30 days)" value={num(data.signals.loginsRecorded30d)} hint="Login history table" />
        <Kpi label="Deletions (30 days)" value={num(data.signals.deletions30d)} hint="Audited delete actions" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Accounts by role"><table className="rg-table"><thead><tr><th>Role</th><th className="text-right">Active</th><th className="text-right">Suspended</th><th className="text-right">Deleted</th></tr></thead><tbody>{data.usersByRole.map(u => <tr key={u.role}><td>{words(u.role)}</td><td className="text-right">{num(u.active)}</td><td className="text-right">{num(u.suspended)}</td><td className="text-right">{num(u.deleted)}</td></tr>)}</tbody></table></Section>
        <Section title="Role permissions (enforced)" description="From the RBAC matrix used by API authorization"><div className="overflow-x-auto"><table className="rg-table text-xs"><thead><tr><th>Permission</th>{data.rbac.map(r => <th key={r.role} className="text-center">{words(r.role)}</th>)}</tr></thead><tbody>{allPermissions.map(p => <tr key={p}><td>{p}</td>{data.rbac.map(r => <td key={r.role} className="text-center">{r.permissions.includes(p) ? "✓" : ""}</td>)}</tr>)}</tbody></table></div></Section>
      </div>
      <Section title="Audit trail" actions={<div className="flex gap-2"><Field label="Entity"><select className="rg-input" value={entity} onChange={e => { setPage(1); setEntity(e.target.value); }}><option value="">All</option>{data.audit.entities.map(x => <option key={x} value={x}>{x}</option>)}</select></Field><Field label="Action"><select className="rg-input" value={action} onChange={e => { setPage(1); setAction(e.target.value); }}><option value="">All</option>{["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT"].map(a => <option key={a} value={a}>{words(a)}</option>)}</select></Field></div>}>
        {data.audit.rows.length ? <><div className="overflow-x-auto"><table className="rg-table min-w-[900px]"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>{data.audit.rows.map(a => <tr key={a.id}><td className="whitespace-nowrap text-xs">{when(a.createdAt)}</td><td className="text-xs">{a.user ? `${a.user.name} (${words(a.user.role)})` : "System"}</td><td>{words(a.action)}</td><td className="text-xs">{a.entityName}<br /><span className="text-neutral-500">{a.entityId}</span></td><td className="max-w-md truncate text-xs text-neutral-500">{a.newValue ? [a.newValue.event, a.newValue.reason].filter(Boolean).map(String).join(" — ") || "—" : "—"}</td></tr>)}</tbody></table></div><Pager page={data.audit.page} totalPages={data.audit.totalPages} total={data.audit.total} onPage={setPage} /></> : <Empty title="No audit records" />}
      </Section>
    </>}</DataState>
  </div></DashboardLayout>;
}
