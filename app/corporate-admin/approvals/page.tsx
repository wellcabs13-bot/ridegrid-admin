"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { ApprovalTable } from "@/components/corporate-admin/tables";
import { Approval, Paged } from "@/components/corporate-admin/types";
import { API, DataState, PageHeader, Pagination, Panel, qs, useAdminData, useDebounced } from "@/components/corporate-admin/ui";

const TABS = [["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["CANCELLED", "Cancelled"], ["", "All"]] as const;

function Approvals() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const { data, loading, error, reload } = useAdminData<Paged<Approval> & { counts: Record<string, number> }>(`${API}/approvals${qs({ status, q: query, page })}`);
  return <>
    <PageHeader title="Approval requests" description="Ride requests your employees submitted from the Corporate Employee app when the travel policy required approval. Your decision updates the same request the employee sees.">
      <button className="rg-secondary" disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button>
    </PageHeader>
    <Panel title="Requests" action={<label className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Search employee" placeholder="Search employee…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-44 bg-transparent text-sm outline-none"/></label>}>
      <div role="tablist" aria-label="Approval status" className="flex gap-1 overflow-x-auto border-b border-neutral-100 px-3">
        {TABS.map(([value, text]) => <button key={value} role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setPage(1); }} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm ${status === value ? "border-red-600 font-semibold text-red-700" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>{text}{value && data?.counts[value] !== undefined ? <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600">{data.counts[value]}</span> : null}</button>)}
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>{data && <>
        <ApprovalTable rows={data.items}/>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage}/>
      </>}</DataState>
    </Panel>
    <p className="text-xs text-neutral-500">Requests shown as expired had a pickup time that passed before a decision or booking. Approving never books a car: the employee confirms at a fresh price and availability.</p>
  </>;
}

export default function ApprovalsPage() { return <Suspense><Approvals/></Suspense>; }
