"use client";
import { useState } from "react";
import s from "./public.module.css";

const FIELDS = [
  { name: "companyName", label: "Company name", type: "text", autoComplete: "organization", required: true },
  { name: "contactPerson", label: "Your name", type: "text", autoComplete: "name", required: true },
  { name: "email", label: "Work email", type: "email", autoComplete: "email", required: true },
  { name: "mobile", label: "Mobile", type: "tel", autoComplete: "tel", required: true },
  { name: "city", label: "City", type: "text", autoComplete: "address-level2", required: false },
] as const;

// Sends a corporate enquiry to the RideGrid CRM (see /api/public/corporate-enquiry).
export default function CorporateEnquiryForm() {
  const [state, setState] = useState<{ busy: boolean; error: string; reference: string }>({ busy: false, error: "", reference: "" });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState({ busy: true, error: "", reference: "" });
    try {
      const res = await fetch("/api/public/corporate-enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "We could not send your enquiry.");
      setState({ busy: false, error: "", reference: json.data.reference ?? "received" });
    } catch (err) { setState({ busy: false, error: err instanceof Error ? err.message : "We could not send your enquiry.", reference: "" }); }
  }
  if (state.reference) return <p role="status" className={s.notice}>Thank you — your enquiry is with the Wellcabs corporate team{state.reference !== "received" ? ` (reference ${state.reference})` : ""}. We will contact you on the details you shared.</p>;
  return <form onSubmit={submit} className={s.search} aria-label="Corporate enquiry">
    <div className={s.fields}>
      {FIELDS.map((f) => <label key={f.name} className={s.field}>{f.label}{f.required ? "" : " (optional)"}<input name={f.name} type={f.type} autoComplete={f.autoComplete} required={f.required} maxLength={160} /></label>)}
      <label className={s.field}>Travellers<select name="employees" defaultValue=""><option value="">Choose</option><option>1–25</option><option>26–100</option><option>101–500</option><option>500+</option></select></label>
      <label className={s.field} style={{ gridColumn: "1 / -1" }}>What do you need? (optional)<input name="message" maxLength={1000} placeholder="e.g. airport transfers for visiting staff, daily employee transport" /></label>
      <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
    <div className={s.searchBottom}>
      <p className={s.searchNote}>We use these details only to respond to your enquiry.</p>
      <button type="submit" className={`${s.button} ${s.searchSubmit}`} disabled={state.busy}>{state.busy ? "Sending…" : "Get a corporate quote"}</button>
    </div>
    {state.error && <p role="alert" className={s.notice}>{state.error}</p>}
  </form>;
}
