"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading, DataState, Metric, useAdminData, date } from "@/components/admin/Primitives";
import RecordTable, { RecordRow, Column, exportCsv } from "@/components/admin/RecordTable";
const money=(value:unknown)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value??0));
const views:Record<string,{url:string;columns:Column[]}>={
  transactions:{url:"/api/finance/transactions",columns:[{key:"referenceNumber",title:"Reference"},{key:"booking.bookingNumber",title:"Booking"},{key:"transactionType",title:"Type"},{key:"paymentMethod",title:"Method"},{key:"paymentStatus",title:"Status"},{key:"amount",title:"Amount",render:r=>money(r.amount)},{key:"createdAt",title:"Created",render:r=>date(String(r.createdAt))}]},
  settlements:{url:"/api/finance/settlements",columns:[{key:"vendor.companyName",title:"Vendor"},{key:"netAmount",title:"Net amount",render:r=>money(r.netAmount)},{key:"settlementStatus",title:"Status"},{key:"settlementReference",title:"Reference"},{key:"createdAt",title:"Created",render:r=>date(String(r.createdAt))}]},
  invoices:{url:"/api/invoices",columns:[{key:"invoiceNumber",title:"Invoice"},{key:"bookingId",title:"Booking"},{key:"totalAmount",title:"Total",render:r=>money(r.totalAmount)},{key:"paymentStatus",title:"Status"},{key:"invoiceDate",title:"Issued",render:r=>date(String(r.invoiceDate))}]},
  refunds:{url:"/api/finance/transactions?type=REFUND",columns:[{key:"referenceNumber",title:"Reference"},{key:"bookingId",title:"Booking"},{key:"amount",title:"Refund",render:r=>money(r.amount)},{key:"paymentStatus",title:"Status"},{key:"createdAt",title:"Created",render:r=>date(String(r.createdAt))}]},
  penalties:{url:"/api/penalties",columns:[{key:"driverId",title:"Driver"},{key:"penaltyType",title:"Type"},{key:"amount",title:"Amount",render:r=>money(r.amount)},{key:"reason",title:"Reason"},{key:"createdAt",title:"Created",render:r=>date(String(r.createdAt))}]}
};
export default function FinancePage(){
  const [view,setView]=useState("transactions");
  const [downloadError,setDownloadError]=useState("");
  const overview=useAdminData<RecordRow>("/api/finance/overview");
  const records=useAdminData<RecordRow[]>(views[view].url);
  const rows=Array.isArray(records.data)?records.data:[];
  async function downloadInvoice(row:RecordRow){
    setDownloadError("");
    try{const response=await fetch("/api/invoices/pdf?id="+encodeURIComponent(String(row.id)));if(!response.ok)throw new Error("Unable to download this invoice.");const url=URL.createObjectURL(await response.blob());const a=document.createElement("a");a.href=url;a.download="invoice-"+String(row.invoiceNumber||row.id)+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    catch(err){setDownloadError(err instanceof Error?err.message:"Download failed.");}
  }
  return <DashboardLayout><div className="space-y-6"><PageHeading title="Finance" description="Recorded transactions, settlement history and invoices from the existing finance service."><button className="rg-secondary" disabled={records.loading||overview.loading} onClick={()=>{void records.reload();void overview.reload();}}>Refresh</button><button className="rg-primary" disabled={!rows.length||records.loading} onClick={()=>exportCsv(rows,views[view].columns,"ridegrid-"+view)}>Export CSV</button></PageHeading>
    <DataState loading={overview.loading} error={overview.error} onRetry={overview.reload}>{overview.data&&<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Paid revenue" value={money(overview.data.totalRevenue)}/><Metric label="Paid expenses" value={money(overview.data.totalExpenses)}/><Metric label="Pending settlements" value={money(overview.data.pendingPayments)}/><Metric label="Processed refunds" value={money(overview.data.totalRefunds)}/></div>}</DataState>
    <div role="tablist" aria-label="Finance views" className="flex flex-wrap gap-2">{Object.keys(views).map(key=><button key={key} role="tab" aria-selected={view===key} onClick={()=>setView(key)} className={view===key?"rg-primary capitalize":"rg-secondary capitalize"}>{key}</button>)}</div>
    {downloadError&&<p role="alert" className="text-sm text-red-700">{downloadError}</p>}
    <DataState loading={records.loading} error={records.error} onRetry={records.reload}><RecordTable rows={rows} columns={views[view].columns} actions={view==="invoices"?row=><button className="text-sm font-medium text-red-700" onClick={()=>void downloadInvoice(row)}>Download PDF</button>:undefined}/></DataState>
    <p className="text-xs text-neutral-500">Expense entry is unavailable because this module has no expense persistence endpoint. Financial amounts and statuses above are stored service results.</p>
  </div></DashboardLayout>;
}