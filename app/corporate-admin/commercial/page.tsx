"use client";
import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { API, DataState, day, Empty, Field, Modal, Notice, PageHeader, Panel, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Doc = { id: string; section: string; kind: string; kindLabel: string; title: string; status: string; documentNumber: string | null; fileName: string; size: number | null; uploadedBy: string; uploadedAt: string | null; supersededAt: string | null; url: string };
type SectionData = { documents: Doc[]; kinds: { value: string; label: string }[]; canUpload: boolean };
type Commercial = {
  sections: { RIDEGRID: SectionData; CLIENT: SectionData; COMMERCIAL: SectionData };
  profile: { serviceTypes: string[]; expectedMonthlyBookings: number | null; updatedAt: string | null };
  contracts: { id: string; contractNumber: string; startDate: string; endDate: string; isActive: boolean; signedBy: string | null }[];
  limits: { maxMb: number; types: string[] };
};
type Upload = { section: "CLIENT" | "COMMERCIAL"; kind: string; title: string; documentNumber: string; replaceId?: string; replaceTitle?: string };
const kb = (n: number | null) => (n ? (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`) : "");

function DocList({ docs, onReplace }: { docs: Doc[]; onReplace?: (d: Doc) => void }) {
  const current = docs.filter((d) => !d.supersededAt), history = docs.filter((d) => d.supersededAt);
  if (!docs.length) return null;
  return <ul className="divide-y divide-neutral-100">{[...current, ...history].map((d) => <li key={d.id} className={`flex flex-wrap items-center gap-4 px-5 py-3 ${d.supersededAt ? "opacity-60" : ""}`}>
    <span className="rounded-lg bg-red-50 p-2 text-red-700"><FileText size={18}/></span>
    <div className="min-w-0 flex-1"><p className="font-medium">{d.title}<span className="ml-2 text-xs font-normal text-neutral-500">{d.kindLabel}</span></p><p className="truncate text-xs text-neutral-500">{d.fileName}{d.size ? ` · ${kb(d.size)}` : ""} · {d.uploadedBy}{d.uploadedAt ? ` · ${when(d.uploadedAt)}` : ""}{d.documentNumber ? ` · No. ${d.documentNumber}` : ""}</p></div>
    <Status value={d.status}/>
    <div className="flex gap-2"><a className="rg-secondary" href={d.url} target="_blank" rel="noreferrer">View</a>{onReplace && !d.supersededAt && !d.id.startsWith("profile-") && <button className="rg-secondary" onClick={() => onReplace(d)}>Replace</button>}</div>
  </li>)}</ul>;
}

export default function CommercialPage() {
  const { data, loading, error, reload } = useAdminData<Commercial>(`${API}/commercial`);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [done, setDone] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  function start(section: "CLIENT" | "COMMERCIAL", replace?: Doc) {
    setError(""); setDone("");
    const kinds = data!.sections[section].kinds;
    setUpload({ section, kind: replace?.kind ?? kinds[0].value, title: replace?.title ?? "", documentNumber: replace?.documentNumber ?? "", replaceId: replace?.id, replaceTitle: replace?.title });
  }
  async function submit() {
    if (!upload) return;
    const f = file.current?.files?.[0];
    if (!f) { setError("Choose a file to upload."); return; }
    const body = new FormData();
    body.append("file", f); body.append("section", upload.section); body.append("kind", upload.kind); body.append("title", upload.title); body.append("documentNumber", upload.documentNumber);
    if (upload.replaceId) body.append("replaceId", upload.replaceId);
    const r = await run(async () => {
      const res = await fetch(`${API}/documents/upload`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Upload failed.");
      return json.data;
    });
    if (r) { setUpload(null); setDone(upload.replaceId ? "New version uploaded; the previous file is kept in the history." : "Document uploaded. RideGrid reviews client documents; the status updates when reviewed."); void reload(); }
  }
  return <>
    <PageHeader title="Commercial and documents" description="Documents between your company and RideGrid by Wellcabs. Files open only through your signed-in session and are never shared with other companies."/>
    {done && <Notice tone="success">{done}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="space-y-6">
      <Panel title="1 · RideGrid / Wellcabs documents" description="Company registration, GST certificate and other credentials published by RideGrid.">
        {data.sections.RIDEGRID.documents.length ? <DocList docs={data.sections.RIDEGRID.documents}/> : <Empty>RideGrid has not published its company documents here yet. Ask your account manager if you need them for vendor onboarding.</Empty>}
      </Panel>
      <Panel title="2 · Your company documents" description="Only what RideGrid needs to bill you: GST certificate, incorporation, PAN and billing/onboarding forms. Do not upload personal identity documents." action={<button className="rg-primary" onClick={() => start("CLIENT")}><Upload size={15}/>Upload</button>}>
        {data.sections.CLIENT.documents.length ? <DocList docs={data.sections.CLIENT.documents} onReplace={(d) => start("CLIENT", d)}/> : <Empty>No company documents uploaded yet.</Empty>}
      </Panel>
      <Panel title="3 · Commercial documents" description="Quotations, agreements, amendments and other supporting documents." action={<button className="rg-primary" onClick={() => start("COMMERCIAL")}><Upload size={15}/>Upload</button>}>
        {data.sections.COMMERCIAL.documents.length ? <DocList docs={data.sections.COMMERCIAL.documents} onReplace={(d) => start("COMMERCIAL", d)}/> : <Empty>No quotation or agreement has been shared yet.</Empty>}
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Contracted services" description={data.profile.updatedAt ? `Commercial profile updated ${when(data.profile.updatedAt)}` : undefined}>
          <div className="space-y-3 p-5 text-sm">{data.profile.serviceTypes.length ? <div className="flex flex-wrap gap-2">{data.profile.serviceTypes.map((s) => <Status key={s} value={s} tone="blue"/>)}</div> : <p className="text-neutral-500">No services recorded on your commercial profile.</p>}
            <p className="text-neutral-600">Expected monthly bookings: <strong>{data.profile.expectedMonthlyBookings ?? "—"}</strong></p></div>
        </Panel>
        <Panel title="Contracts">
          {data.contracts.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Contract</th><th>Term</th><th>Signed by</th><th>Status</th></tr></thead>
            <tbody>{data.contracts.map((c) => <tr key={c.id}><td className="font-medium">{c.contractNumber}</td><td className="whitespace-nowrap">{day(c.startDate)} – {day(c.endDate)}</td><td>{c.signedBy ?? "—"}</td><td><Status value={c.isActive ? "ACTIVE" : "INACTIVE"}/></td></tr>)}</tbody></table></div> : <Empty>No contracts recorded.</Empty>}
        </Panel>
      </div>
    </div>}</DataState>
    <Modal open={!!upload} title={upload?.replaceId ? `Replace “${upload.replaceTitle}”` : upload?.section === "CLIENT" ? "Upload company document" : "Upload commercial document"} onClose={() => setUpload(null)} footer={<><button className="rg-secondary" onClick={() => setUpload(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={submit} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button></>}>
      {upload && data && <div className="space-y-4">
        <Field label="Document type"><select className="rg-input" value={upload.kind} disabled={!!upload.replaceId} onChange={(e) => setUpload({ ...upload, kind: e.target.value })}>{data.sections[upload.section].kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
        <Field label="Title (optional)"><input className="rg-input" maxLength={120} value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })}/></Field>
        <Field label="Document number (optional)" hint="e.g. GSTIN or agreement number."><input className="rg-input" maxLength={60} value={upload.documentNumber} onChange={(e) => setUpload({ ...upload, documentNumber: e.target.value })}/></Field>
        <Field label="File" hint={`${data.limits.types.join(", ")} · up to ${data.limits.maxMb} MB`}><input ref={file} type="file" accept="application/pdf,image/png,image/jpeg" className="rg-input"/></Field>
        {saveError && <Notice tone="error">{saveError}</Notice>}
      </div>}
    </Modal>
  </>;
}
