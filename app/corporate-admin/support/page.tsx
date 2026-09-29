"use client";
import { useState } from "react";
import { Mail, MessageCircle, Phone, Plus, UserRound } from "lucide-react";
import { API, DataState, Empty, Field, Modal, Notice, PageHeader, Panel, send, Status, statusText, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Ticket = { id: string; ticketNumber: string; subject: string; category: string; priority: string; status: string; createdAt: string; resolvedAt: string | null; booking: { id: string; bookingNumber: string } | null };
type Support = {
  name: string; phone: string; phoneHref: string; email: string; emailHref: string; whatsapp: string;
  accountManager: { name: string; email: string | null; mobile: string | null } | null;
  tickets: Ticket[]; categories: string[]; priorities: string[];
};

export default function SupportPage() {
  const { data, loading, error, reload } = useAdminData<Support>(`${API}/support`);
  const [form, setForm] = useState<{ category: string; priority: string; subject: string; description: string } | null>(null);
  const [done, setDone] = useState("");
  const { busy, error: saveError, setError, run } = useSubmit();
  async function submit() {
    if (!form) return;
    const r = await run(() => send<{ ticketNumber: string }>("support", form));
    if (r) { setForm(null); setDone(`Request ${r.ticketNumber} raised. RideGrid support will respond by email or phone.`); void reload(); }
  }
  const card = (href: string, Icon: typeof Phone, title: string, value: string, external = false) =>
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="rg-card flex items-center gap-4 p-5 hover:border-red-200"><span className="rounded-xl bg-red-50 p-3 text-red-700"><Icon size={20}/></span><span><span className="block text-sm text-neutral-500">{title}</span><span className="block font-semibold">{value}</span></span></a>;
  return <>
    <PageHeader title="Support" description="Help with bookings, trips, billing or your account from the RideGrid by Wellcabs team.">
      {data && <button className="rg-primary" onClick={() => { setError(""); setForm({ category: "BOOKING", priority: "MEDIUM", subject: "", description: "" }); }}><Plus size={15}/>Raise a request</button>}
    </PageHeader>
    {done && <Notice tone="success">{done}</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <a href={data.whatsapp} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-emerald-700 p-6 text-white hover:bg-emerald-800">
        <span className="flex items-center gap-4"><MessageCircle size={28} aria-hidden/><span><span className="block text-lg font-semibold">Contact support on WhatsApp</span><span className="block text-sm text-emerald-50">Chat with the Wellcabs team on +91 {data.phone}. Opens WhatsApp with your company name filled in.</span></span></span>
        <span className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800">Open WhatsApp<span className="sr-only"> (opens in a new tab)</span></span>
      </a>
      <div className="grid gap-4 md:grid-cols-2">
        {card(data.phoneHref, Phone, `Call ${data.name}`, `+91 ${data.phone}`)}
        {card(data.emailHref, Mail, "Email", data.email)}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Your support requests" description="Tickets are handled by RideGrid support in the same system operations uses.">
          {data.tickets.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Request</th><th>Category</th><th>Priority</th><th>Status</th><th>Raised</th></tr></thead>
            <tbody>{data.tickets.map((t) => <tr key={t.id}><td><p className="font-medium">{t.subject}</p><p className="text-xs text-neutral-500">#{t.ticketNumber}{t.booking ? ` · ${t.booking.bookingNumber}` : ""}</p></td><td>{statusText(t.category)}</td><td>{statusText(t.priority)}</td><td><Status value={t.status}/></td><td className="whitespace-nowrap">{when(t.createdAt)}</td></tr>)}</tbody></table></div> : <Empty>No support requests yet.</Empty>}
        </Panel>
        <Panel title="Your account manager">
          {data.accountManager ? <div className="flex flex-wrap items-center gap-4 p-5"><span className="rounded-xl bg-neutral-100 p-3"><UserRound size={20}/></span><div className="text-sm"><p className="font-semibold">{data.accountManager.name}</p><p className="text-neutral-500">{[data.accountManager.email, data.accountManager.mobile].filter(Boolean).join(" · ") || "Contact details not recorded"}</p></div></div>
            : <p className="p-5 text-sm text-neutral-500">No dedicated account manager is assigned. Use the support contacts above.</p>}
        </Panel>
      </div>
    </>}</DataState>
    <Modal wide open={!!form} title="Raise a support request" onClose={() => setForm(null)} footer={<><button className="rg-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button><button className="rg-primary" onClick={submit} disabled={busy || !form?.subject.trim() || !form?.description.trim()}>{busy ? "Sending…" : "Submit request"}</button></>}>
      {form && data && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category"><select className="rg-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{data.categories.map((c) => <option key={c} value={c}>{statusText(c)}</option>)}</select></Field>
        <Field label="Priority"><select className="rg-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{data.priorities.map((p) => <option key={p} value={p}>{statusText(p)}</option>)}</select></Field>
        <Field label="Subject" className="sm:col-span-2"><input className="rg-input" maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}/></Field>
        <Field label="Details" hint="Include booking numbers where relevant. Do not share passwords or payment details." className="sm:col-span-2"><textarea className="rg-input min-h-28" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></Field>
        {saveError && <div className="sm:col-span-2"><Notice tone="error">{saveError}</Notice></div>}
      </div>}
    </Modal>
  </>;
}
