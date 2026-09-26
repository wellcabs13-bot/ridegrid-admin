"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData, label, date } from "@/components/admin/Primitives";
import RecordTable, { RecordRow, Column } from "@/components/admin/RecordTable";
const tabs=["audit","sessions","permissions"] as const;
export default function SecurityPage() {
  const [tab,setTab]=useState<typeof tabs[number]>("audit");
  const {data,loading,error,reload}=useAdminData<RecordRow[]>("/api/security/"+tab+(tab==="audit"?"?limit=100":""));
  const columns:Column[]=tab==="audit"?[{key:"action",title:"Action"},{key:"entityName",title:"Entity"},{key:"entityId",title:"Record"},{key:"userId",title:"Actor"},{key:"createdAt",title:"Recorded",render:r=>date(String(r.createdAt))}]:tab==="sessions"?[{key:"userId",title:"User"},{key:"role",title:"Role"},{key:"device",title:"Device"},{key:"browser",title:"Browser"},{key:"status",title:"Status"},{key:"lastActivity",title:"Last activity",render:r=>date(String(r.lastActivity))}]:[{key:"role",title:"Role"},{key:"permissions",title:"Allowed module actions",render:r=><div className="flex flex-wrap gap-2">{(r.permissions as {module:string;action:string}[]).map(p=><span key={p.module+"."+p.action} className="rounded-md bg-neutral-100 px-2 py-1 text-xs">{p.module}: {p.action}</span>)}</div>}];
  return <DashboardLayout><div className="space-y-6"><PageHeading title="Security" description="Inspect the existing audit trail, session registry and configured permissions."><button className="rg-secondary" onClick={reload} disabled={loading}>Refresh</button></PageHeading><div className="flex flex-wrap gap-2" role="tablist" aria-label="Security views">{tabs.map(t=><button role="tab" aria-selected={tab===t} key={t} onClick={()=>setTab(t)} className={tab===t?"rg-primary capitalize":"rg-secondary capitalize"}>{label(t)}</button>)}</div>
    {tab==="sessions"&&<p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">This view shows the existing process session registry. Password login uses JWT and refresh tokens, which are not registered here. Session termination is not offered because this registry does not revoke JWT access.</p>}
    <DataState loading={loading} error={error} onRetry={reload}><RecordTable rows={Array.isArray(data)?data:[]} columns={columns}/></DataState>
  </div></DashboardLayout>;
}
