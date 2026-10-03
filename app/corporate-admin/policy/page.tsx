"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OrgOptions } from "@/components/corporate-admin/types";
import { API, DataState, Field, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Policy = {
  id: string; policyName: string; description: string | null; maxTripAmount: string | null; blockAboveAmount: string | null; allowedCategories: string[]; allowedCities: string[];
  advanceBookingHours: number | null; nightTravelAllowed: boolean; outstationAllowed: boolean; airportTravelAllowed: boolean; localAllowed: boolean; roundTripAllowed: boolean;
  weekendTravelAllowed: boolean; bookingStartHour: number | null; bookingEndHour: number | null; approvalRequired: boolean; isActive: boolean; updatedAt: string;
  scope: "COMPANY" | "BRANCH" | "DEPARTMENT"; branchId: string | null; departmentId: string | null; scopeName: string; assignedEmployees: number;
};
type View = { policy: Policy | null; policies: Policy[]; vehicleCategories: string[]; cities: string[]; approvalStages: number };
type Form = {
  id?: string; scope: "COMPANY" | "BRANCH" | "DEPARTMENT"; scopeId: string; policyName: string; description: string; maxTripAmount: string; blockAboveAmount: string;
  allowedCategories: string[]; allowedCities: string[]; advanceBookingHours: string; nightTravelAllowed: boolean; outstationAllowed: boolean; airportTravelAllowed: boolean;
  localAllowed: boolean; roundTripAllowed: boolean; weekendTravelAllowed: boolean; bookingStartHour: string; bookingEndHour: string; approvalRequired: boolean;
};

const toForm = (p: Policy | null, scope: Form["scope"] = "COMPANY"): Form => ({
  id: p?.id, scope: p?.scope ?? scope, scopeId: p?.departmentId ?? p?.branchId ?? "",
  policyName: p?.policyName ?? (scope === "COMPANY" ? "Company travel policy" : ""), description: p?.description ?? "",
  maxTripAmount: p?.maxTripAmount ?? "", blockAboveAmount: p?.blockAboveAmount ?? "", allowedCategories: p?.allowedCategories ?? [], allowedCities: p?.allowedCities ?? [],
  advanceBookingHours: p?.advanceBookingHours?.toString() ?? "", nightTravelAllowed: p?.nightTravelAllowed ?? true, outstationAllowed: p?.outstationAllowed ?? true,
  airportTravelAllowed: p?.airportTravelAllowed ?? true, localAllowed: p?.localAllowed ?? true, roundTripAllowed: p?.roundTripAllowed ?? true, weekendTravelAllowed: p?.weekendTravelAllowed ?? true,
  bookingStartHour: p?.bookingStartHour?.toString() ?? "", bookingEndHour: p?.bookingEndHour != null ? String(p.bookingEndHour === 0 ? 24 : p.bookingEndHour) : "", approvalRequired: p?.approvalRequired ?? false,
});
const words = (v: string) => v.replaceAll("_", " ").toLowerCase();
const hour = (h: string) => { const n = Number(h); return n === 24 || n === 0 ? "midnight" : n === 12 ? "noon" : n < 12 ? `${n} am` : `${n - 12} pm`; };

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4"><input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)}/><span><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-neutral-500">{hint}</span></span></label>;
}

function Chips({ values, selected, onChange, empty }: { values: string[]; selected: string[]; onChange: (v: string[]) => void; empty: string }) {
  if (!values.length) return <p className="text-xs text-neutral-500">{empty}</p>;
  return <div className="flex flex-wrap gap-2">{values.map((c) => { const on = selected.includes(c); return <button type="button" key={c} aria-pressed={on} onClick={() => onChange(on ? selected.filter((x) => x !== c) : [...selected, c])} className={`rounded-lg border px-3 py-1.5 text-sm ${on ? "border-red-600 bg-red-50 font-semibold text-red-800" : "border-neutral-300 text-neutral-600"}`}>{words(c)}</button>; })}</div>;
}

export default function PolicyPage() {
  const { data, loading, error, reload } = useAdminData<View>(`${API}/policy`);
  const { data: o } = useAdminData<OrgOptions>(`${API}/org-options`);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(toForm(null));
  const [confirm, setConfirm] = useState<null | "SAVE" | "RETIRE">(null);
  const [saved, setSaved] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();
  const current = useMemo(() => data?.policies.find((p) => p.id === selected) ?? null, [data, selected]);
  useEffect(() => { if (data && selected === null) { setSelected(data.policy?.id ?? "new"); setForm(toForm(data.policy)); } }, [data, selected]);
  const f = form;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...f, [k]: v });
  function pick(p: Policy | null, scope: Form["scope"] = "COMPANY") { setSelected(p?.id ?? "new"); setForm(toForm(p, scope)); setSaved(""); setError(""); }
  async function save() {
    const body = { action: "SAVE", ...(f.id ? { id: f.id } : { scoped: f.scope !== "COMPANY" }), ...f,
      branchId: f.scope === "BRANCH" ? f.scopeId || null : null, departmentId: f.scope === "DEPARTMENT" ? f.scopeId || null : null,
      maxTripAmount: f.maxTripAmount || null, blockAboveAmount: f.blockAboveAmount || null, advanceBookingHours: f.advanceBookingHours || null,
      bookingStartHour: f.bookingStartHour === "" ? null : f.bookingStartHour, bookingEndHour: f.bookingEndHour === "" ? null : f.bookingEndHour };
    const r = await run(() => send<View>("policy", body));
    if (r) { setConfirm(null); setSaved("Travel policy saved. It applies to the next search, approval request and booking."); await reload(); if (!f.id) setSelected(null); }
  }
  async function retire() {
    if (!current) return;
    const r = await run(() => send("policy", { action: "SET_ACTIVE", id: current.id, isActive: !current.isActive }));
    if (r) { setConfirm(null); setSaved(current.isActive ? "Policy retired. Affected employees now use their department, branch or company policy." : "Policy reactivated."); void reload(); }
  }
  const categories = f.allowedCategories.length ? f.allowedCategories.map(words).join(", ") : "any category";
  const hoursSet = f.bookingStartHour !== "" && f.bookingEndHour !== "";
  return <>
    <PageHeader title="Travel policy" description="Simple rules RideGrid checks on the server for every employee search, approval request and booking. The most specific policy applies: assigned to the employee, then department, then branch, then the company default.">
      <button className="rg-secondary" onClick={() => pick(null, "DEPARTMENT")}><Plus size={15}/>Branch / department policy</button>
    </PageHeader>
    {saved && <Notice tone="success">{saved}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{data && <div className="grid gap-6 xl:grid-cols-4">
      <Panel title="Policies" className="xl:col-span-1">
        <ul className="divide-y divide-neutral-100">
          {!data.policy && <li><button className={`w-full px-5 py-3 text-left text-sm ${selected === "new" && f.scope === "COMPANY" ? "bg-red-50" : "hover:bg-neutral-50"}`} onClick={() => pick(null)}>Company default <span className="block text-xs text-neutral-500">Not set yet</span></button></li>}
          {data.policies.map((p) => <li key={p.id}><button className={`w-full px-5 py-3 text-left text-sm ${selected === p.id ? "bg-red-50" : "hover:bg-neutral-50"}`} onClick={() => pick(p)}>
            <span className="flex items-center justify-between gap-2"><span className="font-medium">{p.policyName}</span>{!p.isActive && <Status value="INACTIVE"/>}</span>
            <span className="block text-xs text-neutral-500">{p.scope === "COMPANY" ? "Company default" : `${words(p.scope)} · ${p.scopeName}`}{p.assignedEmployees ? ` · ${p.assignedEmployees} assigned` : ""}</span>
          </button></li>)}
        </ul>
      </Panel>
      <Panel className="xl:col-span-2" title={f.id ? f.policyName || "Policy" : f.scope === "COMPANY" ? "New company default policy" : "New branch / department policy"} description={current ? `Last updated ${when(current.updatedAt)}` : "Not saved yet."}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Policy name"><input className="rg-input" maxLength={80} value={f.policyName} onChange={(e) => set("policyName", e.target.value)}/></Field>
          <Field label="Applies to" hint={f.id ? "Scope is fixed once saved." : "Company default applies to everyone without a more specific policy."}>
            <div className="flex gap-2">
              <select className="rg-input" disabled={!!f.id} value={f.scope} onChange={(e) => setForm({ ...f, scope: e.target.value as Form["scope"], scopeId: "" })}>
                {(!data.policy || f.scope === "COMPANY") && <option value="COMPANY">Whole company</option>}<option value="BRANCH">A branch</option><option value="DEPARTMENT">A department</option>
              </select>
              {f.scope !== "COMPANY" && <select aria-label="Branch or department" className="rg-input" disabled={!!f.id} value={f.scopeId} onChange={(e) => set("scopeId", e.target.value)}><option value="">Choose…</option>{(f.scope === "BRANCH" ? (o?.branches ?? []).map((b) => [b.id, b.branchName]) : (o?.departments ?? []).map((d) => [d.id, d.departmentName])).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>}
            </div>
          </Field>
          <Field label="Short description (optional)" className="sm:col-span-2"><input className="rg-input" maxLength={300} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Sales team field travel"/></Field>

          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:col-span-2">Which trips are allowed</p>
          <Toggle label="Outstation one-way" hint="Intercity trips. Off = not allowed at all." checked={f.outstationAllowed} onChange={(v) => set("outstationAllowed", v)}/>
          <Toggle label="Round trips" hint="Outstation trips that return. Off = not allowed." checked={f.roundTripAllowed} onChange={(v) => set("roundTripAllowed", v)}/>
          <Toggle label="Local rentals" hint="8H/80KM and 12H/120KM city packages. Off = not allowed." checked={f.localAllowed} onChange={(v) => set("localAllowed", v)}/>
          <Toggle label="Airport transfers" hint="Airport pickup and drop packages. Off = not allowed." checked={f.airportTravelAllowed} onChange={(v) => set("airportTravelAllowed", v)}/>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium text-neutral-700">Allowed vehicle categories</legend><p className="mb-3 text-xs text-neutral-500">Other categories need approval. Select none to allow every category.</p>
            <Chips values={data.vehicleCategories} selected={f.allowedCategories} onChange={(v) => set("allowedCategories", v)} empty="No categories available."/>
          </fieldset>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium text-neutral-700">Allowed pickup cities</legend><p className="mb-3 text-xs text-neutral-500">Trips starting elsewhere need approval. Select none to allow every city RideGrid serves.</p>
            <Chips values={data.cities} selected={f.allowedCities} onChange={(v) => set("allowedCities", v)} empty="No cities are currently served."/>
          </fieldset>

          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:col-span-2">Amounts and timing</p>
          <Field label="Approval needed above (₹)" hint="Trips costing more go to approval. Empty = no threshold."><input className="rg-input" inputMode="decimal" value={f.maxTripAmount} onChange={(e) => set("maxTripAmount", e.target.value)}/></Field>
          <Field label="Maximum trip amount (₹)" hint="Trips above this are not allowed at all. Empty = no cap."><input className="rg-input" inputMode="decimal" value={f.blockAboveAmount} onChange={(e) => set("blockAboveAmount", e.target.value)}/></Field>
          <Field label="Minimum advance notice (hours)" hint="Trips booked closer to pickup are not allowed. Empty = none."><input className="rg-input" inputMode="numeric" value={f.advanceBookingHours} onChange={(e) => set("advanceBookingHours", e.target.value)}/></Field>
          <Field label="Allowed pickup hours" hint="Pickups outside these hours need approval. Leave both empty for any time.">
            <div className="flex items-center gap-2"><select aria-label="From hour" className="rg-input" value={f.bookingStartHour} onChange={(e) => set("bookingStartHour", e.target.value)}><option value="">Any</option>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hour(String(h))}</option>)}</select><span className="text-sm text-neutral-500">to</span><select aria-label="To hour" className="rg-input" value={f.bookingEndHour} onChange={(e) => set("bookingEndHour", e.target.value)}><option value="">Any</option>{Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{hour(String(h))}</option>)}</select></div>
          </Field>
          <Toggle label="Night travel (10 pm – 6 am)" hint="Off = night pickups need approval." checked={f.nightTravelAllowed} onChange={(v) => set("nightTravelAllowed", v)}/>
          <Toggle label="Weekend travel" hint="Off = Saturday and Sunday pickups need approval." checked={f.weekendTravelAllowed} onChange={(v) => set("weekendTravelAllowed", v)}/>
          <Toggle label="Approval required for every trip" hint="Every allowed trip goes to your approval workflow." checked={f.approvalRequired} onChange={(v) => set("approvalRequired", v)}/>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 px-5 py-4">
          {current && current.scope !== "COMPANY" && <button className="rg-secondary" onClick={() => { setError(""); setConfirm("RETIRE"); }}>{current.isActive ? "Retire policy" : "Reactivate"}</button>}
          <button className="rg-secondary" onClick={() => setForm(toForm(current, f.scope))}>Discard changes</button>
          <button className="rg-primary" disabled={current ? !current.isActive : false} onClick={() => { setError(""); setConfirm("SAVE"); }}>Save policy</button>
        </div>
      </Panel>
      <div className="space-y-6">
        <Panel title="What employees will see">
          <div className="space-y-4 p-5 text-sm">
            <div><Status value="NOT_ALLOWED"/><ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">{!f.outstationAllowed && <li>Outstation one-way trips</li>}{!f.roundTripAllowed && <li>Round trips</li>}{!f.localAllowed && <li>Local rentals</li>}{!f.airportTravelAllowed && <li>Airport transfers</li>}{f.blockAboveAmount && <li>Trips above {inr(f.blockAboveAmount)}</li>}{f.advanceBookingHours && <li>Pickup less than {f.advanceBookingHours} hour(s) away</li>}{f.outstationAllowed && f.roundTripAllowed && f.localAllowed && f.airportTravelAllowed && !f.blockAboveAmount && !f.advanceBookingHours && <li>Nothing is blocked outright</li>}</ul><p className="mt-1 text-xs text-neutral-500">Blocked trips cannot be sent for approval.</p></div>
            <div><Status value="APPROVAL_REQUIRED"/><ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">{f.approvalRequired && <li>Every trip</li>}{f.maxTripAmount && <li>Trips above {inr(f.maxTripAmount)}</li>}{f.allowedCategories.length > 0 && <li>Vehicle outside {categories}</li>}{f.allowedCities.length > 0 && <li>Pickup outside {f.allowedCities.join(", ")}</li>}{!f.nightTravelAllowed && <li>Pickup between 10 pm and 6 am</li>}{!f.weekendTravelAllowed && <li>Weekend pickups</li>}{hoursSet && <li>Pickup outside {hour(f.bookingStartHour)} – {hour(f.bookingEndHour)}</li>}<li>Trips beyond a personal limit or a company, branch, department or employee budget</li></ul></div>
            <div><Status value="ALLOWED"/><p className="mt-2 text-neutral-600">{f.approvalRequired ? "No trip is booked without approval." : "Everything else books immediately on corporate credit at the live price."}</p></div>
          </div>
        </Panel>
        <Panel title="Approval routing"><p className="p-5 text-sm text-neutral-600">{data.approvalStages ? `${data.approvalStages} active approval step(s) are configured.` : "No approval steps are configured, so one company administrator decision completes a request."} <Link href="/corporate-admin/workflow" className="font-semibold text-red-700">Approval workflow →</Link></p></Panel>
      </div>
    </div>}</DataState>
    <Modal open={!!confirm} title={confirm === "RETIRE" ? (current?.isActive ? "Retire this policy?" : "Reactivate this policy?") : "Save travel policy?"} onClose={() => setConfirm(null)} footer={<><button className="rg-secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={confirm === "RETIRE" ? retire : save} disabled={busy}>{busy ? "Saving…" : "Confirm"}</button></>}>
      <p className="text-sm text-neutral-600">{confirm === "RETIRE" ? "Employees using this policy fall back to their department, branch or company policy. Existing requests and bookings are unchanged." : "The rules apply to every affected employee's next search, request and booking. Requests already submitted keep their current status."}</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
