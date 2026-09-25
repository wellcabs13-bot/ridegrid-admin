"use client";
import { FileText } from "lucide-react";
import { API, DataState, day, Empty, PageHeader, Panel, Status, useAdminData, when } from "@/components/corporate-admin/ui";

type Doc = { kind: string; fileName: string; url: string } | null;
type Commercial = { serviceTypes: string[]; quotation: Doc; agreement: Doc; updatedAt: string | null; contracts: { id: string; contractNumber: string; startDate: string; endDate: string; isActive: boolean; signedBy: string | null }[] };

function DocCard({ title, doc }: { title: string; doc: Doc }) {
  return <div className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4">
    <span className="rounded-lg bg-red-50 p-2.5 text-red-700"><FileText size={20}/></span>
    <div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="truncate text-xs text-neutral-500">{doc ? doc.fileName : "Not shared yet"}</p></div>
    {doc ? <a className="rg-secondary" href={doc.url} target="_blank" rel="noreferrer">View</a> : <Status value="Not available" tone="gray"/>}
  </div>;
}

export default function CommercialPage() {
  const { data, loading, error, reload } = useAdminData<Commercial>(`${API}/commercial`);
  return <>
    <PageHeader title="Commercial profile and documents" description="Services and documents agreed with RideGrid. Documents open through your authenticated session only; they are managed by your RideGrid account team."/>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Panel title="Quotation and agreement" description={data.updatedAt ? `Updated ${when(data.updatedAt)}` : undefined}>
          <div className="grid gap-3 p-5 md:grid-cols-2"><DocCard title="Quotation" doc={data.quotation}/><DocCard title="Corporate agreement" doc={data.agreement}/></div>
        </Panel>
        <Panel title="Contracts">
          {data.contracts.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Contract</th><th>Term</th><th>Signed by</th><th>Status</th></tr></thead>
            <tbody>{data.contracts.map((c) => <tr key={c.id}><td className="font-medium">{c.contractNumber}</td><td className="whitespace-nowrap">{day(c.startDate)} – {day(c.endDate)}</td><td>{c.signedBy ?? "—"}</td><td><Status value={c.isActive ? "ACTIVE" : "INACTIVE"}/></td></tr>)}</tbody></table></div> : <Empty>No contracts recorded.</Empty>}
        </Panel>
      </div>
      <Panel title="Contracted services">
        {data.serviceTypes.length ? <div className="flex flex-wrap gap-2 p-5">{data.serviceTypes.map((s) => <Status key={s} value={s} tone="blue"/>)}</div> : <Empty>No services recorded on your commercial profile.</Empty>}
      </Panel>
    </div>}</DataState>
  </>;
}
