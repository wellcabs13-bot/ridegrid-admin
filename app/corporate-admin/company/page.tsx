"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { API, DataState, day, Detail, Field, Modal, Notice, PageHeader, Panel, send, Status, statusText, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Company = {
  companyName: string; legalName: string | null; gstNumber: string | null; panNumber: string | null; email: string; mobile: string; website: string | null;
  address: string; city: string | null; state: string; country: string; pincode: string; status: string; billingCycle: string; paymentTermsDays: number | null; createdAt: string; updatedAt: string;
  billingAddress: string | null; billingCity: string | null; billingState: string | null; billingPincode: string | null;
  contactPersonName: string | null; contactPersonDesignation: string | null; contactPersonEmail: string | null; contactPersonMobile: string | null;
  accountManagerName: string | null; accountManagerEmail: string | null; accountManagerMobile: string | null;
  branches: { id: string; branchName: string; city: string | null; isHeadOffice: boolean; isActive: boolean }[];
  administrators: { name: string; email: string }[];
  _count: { employees: number; branches: number; corporateDepartments: number };
};
type Section = "identity" | "contact" | "registered" | "billing";
const FIELDS: Record<Section, { title: string; fields: [key: keyof Company, label: string, hint?: string][] }> = {
  identity: { title: "Company identity", fields: [["companyName", "Display name"], ["legalName", "Legal / registered name"], ["gstNumber", "GSTIN", "15 characters. Must be unique across RideGrid."], ["panNumber", "PAN", "10 characters."], ["website", "Website", "Starts with https://"]] },
  contact: { title: "Primary contact", fields: [["contactPersonName", "Contact person"], ["contactPersonDesignation", "Designation"], ["contactPersonEmail", "Email"], ["contactPersonMobile", "Mobile"], ["mobile", "Company phone"]] },
  registered: { title: "Registered address", fields: [["address", "Address"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"]] },
  billing: { title: "Billing address", fields: [["billingAddress", "Billing address", "Leave empty to bill to the registered address."], ["billingCity", "City"], ["billingState", "State"], ["billingPincode", "Pincode"]] },
};

export default function CompanyPage() {
  const { data: c, loading, error, reload } = useAdminData<Company>(`${API}/company`);
  const [section, setSection] = useState<Section | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();
  function edit(s: Section) { if (!c) return; setError(""); setSection(s); setForm(Object.fromEntries(FIELDS[s].fields.map(([k]) => [k, String(c[k] ?? "")]))); }
  async function save() {
    if (!section) return;
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]));
    if (await run(() => send("company", { action: "UPDATE", ...body }))) { setSection(null); setSaved("Company profile updated. RideGrid sees the same record."); void reload(); }
  }
  const editBtn = (s: Section) => <button className="rg-secondary" onClick={() => edit(s)}><Pencil size={14}/>Edit</button>;
  return <>
    <PageHeader title="Company profile" description="Your company's single record with RideGrid — the same record RideGrid operations use. Status, credit, billing cycle, payment terms and the account email are managed by RideGrid."/>
    {saved && <Notice tone="success">{saved}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{c && <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Panel title={c.companyName} action={<div className="flex items-center gap-2"><Status value={c.status}/>{editBtn("identity")}</div>}>
          <Detail items={[["Legal name", c.legalName ?? "—"], ["GSTIN", c.gstNumber ?? "—"], ["PAN", c.panNumber ?? "—"], ["Account email", c.email], ["Website", c.website ?? "—"], ["Customer since", day(c.createdAt)], ["Last updated", when(c.updatedAt)]]}/>
        </Panel>
        <Panel title="Primary contact" description="Your company's main travel contact for RideGrid." action={editBtn("contact")}>
          <Detail items={[["Contact person", c.contactPersonName ?? "—"], ["Designation", c.contactPersonDesignation ?? "—"], ["Email", c.contactPersonEmail ?? "—"], ["Mobile", c.contactPersonMobile ?? "—"], ["Company phone", c.mobile], ["Portal administrators", c.administrators.map((a) => a.name).join(", ") || "—"]]}/>
        </Panel>
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Registered address" action={editBtn("registered")}><Detail items={[["Address", c.address], ["City", c.city ?? "—"], ["State", c.state], ["Pincode", c.pincode], ["Country", c.country]]}/></Panel>
          <Panel title="Billing address" action={editBtn("billing")}>{c.billingAddress ? <Detail items={[["Address", c.billingAddress], ["City", c.billingCity ?? "—"], ["State", c.billingState ?? "—"], ["Pincode", c.billingPincode ?? "—"]]}/> : <p className="p-5 text-sm text-neutral-500">Same as the registered address.</p>}</Panel>
        </div>
      </div>
      <div className="space-y-6">
        <Panel title="Account terms" description="Managed by RideGrid."><Detail items={[["Billing cycle", statusText(c.billingCycle)], ["Payment terms", c.paymentTermsDays ? `${c.paymentTermsDays} days` : "—"], ["Account manager", c.accountManagerName ? [c.accountManagerName, c.accountManagerEmail, c.accountManagerMobile].filter(Boolean).join(" · ") : "Not assigned"]]}/></Panel>
        <Panel title="Organisation" description={`${c._count.employees} employees · ${c._count.branches} branches · ${c._count.corporateDepartments} departments`}>
          {c.branches.length ? <ul className="divide-y divide-neutral-100">{c.branches.map((b) => <li key={b.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{b.branchName}{b.city ? <span className="text-neutral-500"> · {b.city}</span> : null}</span><span className="flex gap-1">{b.isHeadOffice && <Status value="Head office" tone="blue"/>}{!b.isActive && <Status value="INACTIVE"/>}</span></li>)}</ul> : <p className="p-5 text-sm text-neutral-500">No branches recorded.</p>}
        </Panel>
      </div>
    </div>}</DataState>
    <Modal wide open={!!section} title={section ? `Edit ${FIELDS[section].title.toLowerCase()}` : ""} onClose={() => setSection(null)} footer={<><button className="rg-secondary" onClick={() => setSection(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
      {section && <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS[section].fields.map(([k, label, hint]) => <Field key={k} label={label} hint={hint} className={k === "address" || k === "billingAddress" ? "sm:col-span-2" : ""}><input className="rg-input" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })}/></Field>)}
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
  </>;
}
