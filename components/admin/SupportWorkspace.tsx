"use client";
import { useState } from "react";
import { DataState, PageHeading, useAdminData, apiData, date, Badge } from "./Primitives";
import RecordTable, { RecordRow } from "./RecordTable";
const statuses = ["OPEN","ASSIGNED","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED"];
const priorities = ["LOW","MEDIUM","HIGH","CRITICAL"];
const categories = ["BOOKING","PAYMENT","DRIVER","VEHICLE","VENDOR","CORPORATE","TECHNICAL","ACCOUNT","OTHER"];
export default function SupportWorkspace() {
  const {data,loading,error,reload}=useAdminData<RecordRow[]>("/api/support/tickets");
  const [selected,setSelected]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState("");
  const details=useAdminData<RecordRow>(selected?"/api/support/tickets/"+encodeURIComponent(selected):null);
  const [message,setMessage]=useState("");
  async function mutate(url:string,body:RecordRow,method="POST") {
    if(busy) return;
    setBusy(true); setActionError("");
    try { await apiData(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); await reload(); if(selected) await details.reload(); return true; }
    catch(err){setActionError(err instanceof Error?err.message:"Unable to save.");return false;}
    finally{setBusy(false);}
  }
  return <div className="space-y-6"><PageHeading title="Support" description="Manage recorded tickets, conversations and service-level status."><button className="rg-secondary" onClick={reload} disabled={loading}>Refresh</button><button className="rg-primary" onClick={()=>{setCreating(!creating);setActionError("");}}>{creating?"Close new ticket":"New ticket"}</button></PageHeading>
    {actionError&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
    {creating&&<form className="rg-card space-y-4 p-6" onSubmit={async e=>{
      e.preventDefault(); const form=new FormData(e.currentTarget);
      if(await mutate("/api/support/tickets",{subject:form.get("subject"),description:form.get("description"),category:form.get("category"),priority:form.get("priority"),source:"ADMIN"}))setCreating(false);
    }}><h2 className="font-semibold">Create a support ticket</h2><label className="block text-sm">Subject<input name="subject" required maxLength={200} className="rg-input mt-2"/></label><label className="block text-sm">Description<textarea name="description" required maxLength={10000} rows={3} className="rg-input mt-2"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Category<select name="category" className="rg-input mt-2">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm">Priority<select name="priority" defaultValue="MEDIUM" className="rg-input mt-2">{priorities.map(p=><option key={p}>{p}</option>)}</select></label></div><button disabled={busy} className="rg-primary">{busy?"Saving…":"Create ticket"}</button></form>}
    <DataState loading={loading} error={error} onRetry={reload}><RecordTable rows={data??[]} columns={[{key:"ticketNumber",title:"Ticket"},{key:"subject",title:"Subject"},{key:"priority",title:"Priority"},{key:"status",title:"Status",render:r=><Badge>{String(r.status)}</Badge>},{key:"sla.status",title:"SLA"},{key:"createdAt",title:"Created",render:r=>date(String(r.createdAt))}]} onSelect={row=>{setSelected(String(row.id));setActionError("");setMessage("");}}/></DataState>
    {selected&&<section className="rg-card p-6" aria-label="Ticket details"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Ticket details</h2><button className="rg-secondary" onClick={()=>setSelected(null)}>Close details</button></div><DataState loading={details.loading} error={details.error} onRetry={details.reload}>{details.data&&<>
      <h3 className="text-lg font-semibold">{String(details.data.subject)}</h3><p className="mt-3 whitespace-pre-wrap text-sm text-neutral-600">{String(details.data.description??"")}</p>
      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void mutate("/api/support/tickets/"+encodeURIComponent(selected),{status:form.get("status"),priority:form.get("priority")},"PATCH");}} key={String(details.data.updatedAt)}>
        <label className="text-sm">Status<select name="status" defaultValue={String(details.data.status)} className="rg-input mt-2">{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label className="text-sm">Priority<select name="priority" defaultValue={String(details.data.priority)} className="rg-input mt-2">{priorities.map(s=><option key={s}>{s}</option>)}</select></label><button disabled={busy} className="rg-primary">Save changes</button>
      </form>
      <h3 className="mt-8 font-semibold">Conversation</h3><div className="mt-4 space-y-3">{(details.data.messages as RecordRow[]??[]).map(m=><div key={String(m.id)} className="rounded-xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">{String(m.senderType)} · {date(String(m.createdAt))}{m.isInternal?" · Internal note":""}</p><p className="mt-2 whitespace-pre-wrap text-sm">{String(m.message)}</p></div>)}</div>
      <form className="mt-4 space-y-3" onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);if(await mutate("/api/support/tickets/"+encodeURIComponent(selected)+"/messages",{message:message.trim(),senderType:"SUPPORT_AGENT",isInternal:form.get("internal")==="on"}))setMessage("");}}>
        <label className="block text-sm">Message<textarea required maxLength={10000} value={message} onChange={e=>setMessage(e.target.value)} className="rg-input mt-2" rows={3}/></label><label className="flex items-center gap-2 text-sm"><input name="internal" type="checkbox" defaultChecked/>Internal note</label><button disabled={busy||!message.trim()} className="rg-primary">{busy?"Saving…":"Add message"}</button>
      </form>
    </>}</DataState></section>}
  </div>;
}
