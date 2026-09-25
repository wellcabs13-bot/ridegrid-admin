"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { DataState, PageHeading, Metric, useAdminData, Badge, date } from "@/components/admin/Primitives";
import RecordTable, { RecordRow } from "@/components/admin/RecordTable";
export default function NotificationsPage() {
  const {user}=useAuth();
  const [status,setStatus]=useState("");
  const {data,loading,error,reload}=useAdminData<RecordRow[]>(user ? "/api/notifications?userId="+encodeURIComponent(user.id) : null);
  const rows=data??[];
  const filtered=rows.filter(row=>!status || row.status===status);
  return <DashboardLayout><div className="space-y-6"><PageHeading title="Notifications" description="Notification records for your account, with the delivery status recorded by the existing notification service."><button className="rg-secondary" disabled={loading} onClick={reload}>Refresh</button></PageHeading>
    <DataState loading={loading} error={error} onRetry={reload}>
      <div className="grid gap-4 sm:grid-cols-3"><Metric label="Notifications" value={rows.length}/><Metric label="Pending delivery" value={rows.filter(r=>r.status==="PENDING").length}/><Metric label="Failed delivery" value={rows.filter(r=>r.status==="FAILED").length}/></div>
      <label className="mt-6 block max-w-xs text-sm">Delivery status<select className="rg-input mt-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{Array.from(new Set(rows.map(r=>String(r.status)))).map(s=><option key={s}>{s}</option>)}</select></label>
      <div className="mt-4"><RecordTable rows={filtered} columns={[{key:"title",title:"Title"},{key:"message",title:"Message"},{key:"notificationType",title:"Channel"},{key:"status",title:"Delivery",render:r=><Badge>{String(r.status)}</Badge>},{key:"createdAt",title:"Created",render:r=>date(String(r.createdAt))}]}/></div>
    </DataState>
    <p className="text-xs text-neutral-500">Delivery and read receipts are different. This system currently exposes delivery records; no read status is inferred.</p>
  </div></DashboardLayout>;
}
