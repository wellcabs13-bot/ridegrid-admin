"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { API, DataState, day, Detail, Field, Modal, Notice, PageHeader, Panel, send, Status, statusText, useAdminData, useSubmit } from "@/components/corporate-admin/ui";

type Company = {
  companyName: string; legalName: string | null; gstNumber: string | null; panNumber: string | null; email: string; mobile: string; website: string | null;
  address: string; city: string | null; state: string; country: string; pincode: string; status: string; billingCycle: string; paymentTermsDays: number | null; createdAt: string;
  branches: { id: string; branchName: string; city: string | null; isHeadOffice: boolean }[];
  _count: { employees: number; branches: number; corporateDepartments: number };
};
type Form = { mobile: string; website: string; address: string; city: string; state: string; pincode: string };

export default function CompanyPage() {
  const { data: c, loading, error, reload } = useAdminData<Company>(`${API}/company`);
  const [form, setForm] = useState<Form | null>(null);
  const { busy, error: saveError, setError, run } = useSubmit();
  async function save() { if (form && await run(() => send("company", { action: "UPDATE", ...form }))) { setForm(null); void reload(); } }
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });
  return <>
    <PageHeader title="Company profile" description="Your company's record with RideGrid. Contact and billing address can be updated here; legal name, tax identifiers and commercial terms are maintained by RideGrid.">
      {c && <button className="rg-primary" onClick={() => { setError(""); setForm({ mobile: c.mobile, website: c.website ?? "", address: c.address, city: c.city ?? "", state: c.state, pincode: c.pincode }); }}><Pencil size={15}/>Edit contact details</button>}
    </PageHeader>
    <DataState loading={loading} error={error} onRetry={reload}>{c && <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Panel title={c.companyName} action={<Status value={c.status}/>}>
          <Detail items={[["Legal name", c.legalName ?? "—"], ["GSTIN", c.gstNumber ?? "—"], ["PAN", c.panNumber ?? "—"], ["Account email", c.email], ["Contact mobile", c.mobile], ["Website", c.website ?? "—"], ["Customer since", day(c.createdAt)]]}/>
        </Panel>
        <Panel title="Billing address"><Detail items={[["Address", c.address], ["City", c.city ?? "—"], ["State", c.state], ["Pincode", c.pincode], ["Country", c.country]]}/></Panel>
      </div>
      <div className="space-y-6">
        <Panel title="Account terms"><Detail items={[["Billing cycle", statusText(c.billingCycle)], ["Payment terms", c.paymentTermsDays ? `${c.paymentTermsDays} days` : "—"]]}/></Panel>
        <Panel title="Organisation" description={`${c._count.employees} employees · ${c._count.branches} branches · ${c._count.corporateDepartments} departments`}>
          {c.branches.length ? <ul className="divide-y divide-neutral-100">{c.branches.map((b) => <li key={b.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{b.branchName}{b.city ? <span className="text-neutral-500"> · {b.city}</span> : null}</span>{b.isHeadOffice && <Status value="Head office" tone="blue"/>}</li>)}</ul> : <p className="p-5 text-sm text-neutral-500">No branches recorded.</p>}
        </Panel>
      </div>
    </div>}</DataState>
    <Modal open={!!form} title="Edit contact details" onClose={() => setForm(null)} footer={<><button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact mobile"><input className="rg-input" type="tel" value={form.mobile} onChange={set("mobile")}/></Field>
        <Field label="Website"><input className="rg-input" placeholder="https://" value={form.website} onChange={set("website")}/></Field>
        <Field label="Billing address" className="sm:col-span-2"><input className="rg-input" maxLength={300} value={form.address} onChange={set("address")}/></Field>
        <Field label="City"><input className="rg-input" value={form.city} onChange={set("city")}/></Field>
        <Field label="State"><input className="rg-input" value={form.state} onChange={set("state")}/></Field>
        <Field label="Pincode"><input className="rg-input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")}/></Field>
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
  </>;
}
