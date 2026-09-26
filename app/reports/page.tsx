"use client";
import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData, label } from "@/components/admin/Primitives";
import RecordTable, { Column, RecordRow, exportCsv } from "@/components/admin/RecordTable";
const reports = ["booking","revenue","vendor","driver","vehicle","gst","corporate"];
export default function ReportsPage() {
  const [report,setReport]=useState("booking");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const params = new URLSearchParams({report});
  if(from) params.set("from",from);
  if(to) params.set("to",to+"T23:59:59.999");
  const {data,loading,error,reload}=useAdminData<RecordRow[]>("/api/reports?"+params);
  const rows=Array.isArray(data)?data:[];
  const columns=useMemo<Column[]>(()=>Array.from(new Set(rows.flatMap(row=>Object.keys(row)))).filter(key=>!["id","createdAt","updatedAt"].includes(key) && rows.some(row=>row[key] !== null && typeof row[key]!=="object")).map(key=>({key,title:label(key)})),[data]);
  return <DashboardLayout><div className="space-y-6"><PageHeading title="Reports" description="Stored operational and financial reports. Date filters use each report’s reporting period."><button className="rg-secondary" disabled={loading} onClick={reload}>Refresh</button><button className="rg-primary" disabled={!rows.length || loading} onClick={()=>exportCsv(rows,columns,"ridegrid-"+report)}>Export CSV</button></PageHeading>
    <div className="rg-card grid gap-4 p-5 sm:grid-cols-3"><label className="space-y-2 text-sm"><span>Report</span><select className="rg-input capitalize" value={report} onChange={e=>setReport(e.target.value)}>{reports.map(r=><option key={r} value={r}>{label(r)}</option>)}</select></label><label className="space-y-2 text-sm"><span>From</span><input className="rg-input" type="date" max={to||undefined} value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="space-y-2 text-sm"><span>Through</span><input className="rg-input" type="date" min={from||undefined} value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    <DataState loading={loading} error={error} empty={!rows.length} onRetry={reload}><RecordTable rows={rows} columns={columns}/></DataState>
    <p className="text-xs text-neutral-500">An empty report means no stored report records match the selected period. It does not imply zero business activity.</p>
  </div></DashboardLayout>;
}
