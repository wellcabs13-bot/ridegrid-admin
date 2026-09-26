"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API, DataState, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Policy = { id: string; policyName: string; maxTripAmount: string | null; allowedCategories: string[]; advanceBookingHours: number | null; nightTravelAllowed: boolean; outstationAllowed: boolean; airportTravelAllowed: boolean; approvalRequired: boolean; updatedAt: string };
type View = { policy: Policy | null; vehicleCategories: string[]; approvalStages: number };
type Form = { policyName: string; maxTripAmount: string; allowedCategories: string[]; advanceBookingHours: string; nightTravelAllowed: boolean; outstationAllowed: boolean; airportTravelAllowed: boolean; approvalRequired: boolean };

const toForm = (p: Policy | null): Form => ({
  policyName: p?.policyName ?? "Company travel policy", maxTripAmount: p?.maxTripAmount ?? "", allowedCategories: p?.allowedCategories ?? [],
  advanceBookingHours: p?.advanceBookingHours?.toString() ?? "", nightTravelAllowed: p?.nightTravelAllowed ?? true, outstationAllowed: p?.outstationAllowed ?? true,
  airportTravelAllowed: p?.airportTravelAllowed ?? true, approvalRequired: p?.approvalRequired ?? false,
});

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4"><input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)}/><span><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-neutral-500">{hint}</span></span></label>;
}

export default function PolicyPage() {
  const { data, loading, error, reload } = useAdminData<View>(`${API}/policy`);
  const [form, setForm] = useState<Form>(toForm(null));
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState("");
  const { busy, error: saveError, run } = useSubmit();
  useEffect(() => { if (data) setForm(toForm(data.policy)); }, [data]);
  const f = form;
  async function save() {
    const r = await run(() => send("policy", { action: "SAVE", ...f, maxTripAmount: f.maxTripAmount || null, advanceBookingHours: f.advanceBookingHours || null }));
    if (r) { setConfirm(false); setSaved("Travel policy saved. The Corporate Employee app applies it to the next search and booking."); void reload(); }
  }
  const categories = f.allowedCategories.length ? f.allowedCategories.map((c) => c.replaceAll("_", " ").toLowerCase()).join(", ") : "any category";
  return <>
    <PageHeader title="Travel policy" description="One company policy, evaluated on the RideGrid server for every employee search and booking. The employee app shows the server's decision; nothing is evaluated in this portal."/>
    {saved && <Notice tone="success">{saved}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="grid gap-6 xl:grid-cols-3">
      <Panel className="xl:col-span-2" title="Policy rules" description={data.policy ? `Last updated ${when(data.policy.updatedAt)}` : "No policy yet — every trip is currently allowed unless an employee limit is exceeded."}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Policy name"><input className="rg-input" maxLength={80} value={f.policyName} onChange={(e) => setForm({ ...f, policyName: e.target.value })}/></Field>
          <Field label="Maximum amount per trip (₹)" hint="Trips above this need approval. Empty means no limit."><input className="rg-input" inputMode="decimal" value={f.maxTripAmount} onChange={(e) => setForm({ ...f, maxTripAmount: e.target.value })}/></Field>
          <Field label="Minimum advance notice (hours)" hint="Trips booked closer to pickup are not allowed. Empty means none."><input className="rg-input" inputMode="numeric" value={f.advanceBookingHours} onChange={(e) => setForm({ ...f, advanceBookingHours: e.target.value })}/></Field>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium text-neutral-700">Allowed vehicle categories</legend><p className="mb-3 text-xs text-neutral-500">Other categories need approval. Select none to allow every category.</p>
            <div className="flex flex-wrap gap-2">{data.vehicleCategories.map((c) => { const on = f.allowedCategories.includes(c); return <button type="button" key={c} aria-pressed={on} onClick={() => setForm({ ...f, allowedCategories: on ? f.allowedCategories.filter((x) => x !== c) : [...f.allowedCategories, c] })} className={`rounded-lg border px-3 py-1.5 text-sm ${on ? "border-red-600 bg-red-50 font-semibold text-red-800" : "border-neutral-300 text-neutral-600"}`}>{c.replaceAll("_", " ").toLowerCase()}</button>; })}</div>
          </fieldset>
          <Toggle label="Outstation travel allowed" hint="When off, outstation trips are not allowed." checked={f.outstationAllowed} onChange={(v) => setForm({ ...f, outstationAllowed: v })}/>
          <Toggle label="Airport travel allowed" hint="When off, airport-transfer packages are not allowed." checked={f.airportTravelAllowed} onChange={(v) => setForm({ ...f, airportTravelAllowed: v })}/>
          <Toggle label="Night travel allowed" hint="When off, pickups between 10 pm and 6 am (India time) need approval." checked={f.nightTravelAllowed} onChange={(v) => setForm({ ...f, nightTravelAllowed: v })}/>
          <Toggle label="Approval required for every trip" hint="Every allowed trip goes to your approval queue." checked={f.approvalRequired} onChange={(v) => setForm({ ...f, approvalRequired: v })}/>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 px-5 py-4"><button className="rg-secondary" onClick={() => setForm(toForm(data.policy))}>Discard changes</button><button className="rg-primary" onClick={() => setConfirm(true)}>Save policy</button></div>
      </Panel>
      <div className="space-y-6">
        <Panel title="What employees will see">
          <div className="space-y-4 p-5 text-sm">
            <div><Status value="NOT_ALLOWED"/><ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">{!f.outstationAllowed && <li>Any outstation trip</li>}{!f.airportTravelAllowed && <li>Any airport transfer</li>}{f.advanceBookingHours && <li>Pickup less than {f.advanceBookingHours} hour(s) away</li>}{f.outstationAllowed && f.airportTravelAllowed && !f.advanceBookingHours && <li>Nothing is blocked outright</li>}</ul><p className="mt-1 text-xs text-neutral-500">Blocked trips cannot be sent for approval.</p></div>
            <div><Status value="APPROVAL_REQUIRED"/><ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">{f.approvalRequired && <li>Every trip</li>}{f.maxTripAmount && <li>Trip amount above {inr(f.maxTripAmount)}</li>}{f.allowedCategories.length > 0 && <li>Vehicle outside {categories}</li>}{!f.nightTravelAllowed && <li>Pickup between 10 pm and 6 am</li>}<li>Trip that would exceed the employee&apos;s own monthly or yearly limit</li></ul></div>
            <div><Status value="ALLOWED"/><p className="mt-2 text-neutral-600">{f.approvalRequired ? "No trip is booked without approval." : "Everything else books immediately at the live price."}</p></div>
          </div>
        </Panel>
        <Panel title="Approval routing"><p className="p-5 text-sm text-neutral-600">{data.approvalStages ? `${data.approvalStages} active approval step(s) are configured.` : "No approval steps are configured, so one company administrator decision completes a request."} <Link href="/corporate-admin/workflow" className="font-semibold text-red-700">Approval workflow →</Link></p></Panel>
      </div>
    </div>}</DataState>
    <Modal open={confirm} title="Save travel policy?" onClose={() => setConfirm(false)} footer={<><button className="rg-secondary" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save and apply"}</button></>}>
      <p className="text-sm text-neutral-600">The new rules apply to every employee&apos;s next search and booking. Requests already submitted keep their current status.</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
