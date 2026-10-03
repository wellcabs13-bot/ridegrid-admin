"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Empty, Field, Notice, Pager, Pill, Section, num, send, when, words } from "@/components/admin/kit";

type Template = { id: string; name: string; preview: string; active: boolean; updatedAt: string };
type View = {
  channels: { channel: string; label: string; status: string; detail: string }[];
  summary: { type: string; status: string; count: number }[];
  rows: { id: string; notificationType: string; title: string; message: string; status: string; sentAt: string | null; readAt: string | null; createdAt: string; user: { name: string; email: string; role: string } }[];
  total: number; page: number; totalPages: number;
  templates: Record<"EMAIL" | "SMS" | "WHATSAPP", Template[]>;
};

export default function NotificationsPage() {
  const [f, setF] = useState({ type: "", status: "", q: "" }); const [applied, setApplied] = useState(f); const [page, setPage] = useState(1);
  const [data, setData] = useState<View | null>(null); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const url = useMemo(() => `/api/admin/platform?view=notifications&${new URLSearchParams(Object.fromEntries(Object.entries({ ...applied, page: String(page) }).filter(([, v]) => v)) as Record<string, string>)}`, [applied, page]);
  const load = useCallback(async () => { setError(""); try { setData(await send<View>(url, "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load."); } }, [url]);
  useEffect(() => { void load(); }, [load]);
  const toggle = async (kind: string, t: Template) => {
    try { await send("/api/admin/platform", "POST", { action: "template-active", kind, id: t.id, active: !t.active }); setNotice(`${t.name} ${t.active ? "disabled" : "enabled"}.`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
  };
  const sum = (status?: string) => (data?.summary ?? []).filter(s => !status || s.status === status).reduce((a, s) => a + s.count, 0);

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Notifications" description="RideGrid's central notification records across customers, drivers, vendors and corporate users. Email, SMS and WhatsApp stay disabled until a provider is connected." />
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}
    {error && <Notice tone="error">{error}</Notice>}
    {data && <>
      <Section title="Channels"><ul className="divide-y divide-slate-200">{data.channels.map(c => <li key={c.channel} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-neutral-500">{c.detail}</p></div><Pill value={c.status} label={c.status === "ACTIVE" ? "Active" : "Not configured"} /></li>)}</ul></Section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["All notifications", sum()], ["Sent / delivered (in-app)", sum("SENT") + sum("DELIVERED")], ["Pending (no provider yet)", sum("PENDING")], ["Failed", sum("FAILED")]].map(([l, v]) => <div key={l as string} className="rg-card p-4"><p className="text-xs text-neutral-500">{l}</p><p className="mt-1 text-2xl font-semibold">{num(v as number)}</p></div>)}</div>
      <section className="rg-card p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied(f); }}>
        <Field label="Search title, message, recipient email"><input className="rg-input" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} /></Field>
        <Field label="Channel"><select className="rg-input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="">All</option><option value="PUSH">In-app</option><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option></select></Field>
        <Field label="Status"><select className="rg-input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="">All</option>{["PENDING", "SENT", "DELIVERED", "FAILED"].map(s => <option key={s} value={s}>{words(s)}</option>)}</select></Field>
        <div className="flex items-end"><button className="rg-primary" type="submit">Apply</button></div>
      </form></section>
      <Section title="Notification log">{data.rows.length ? <><div className="overflow-x-auto"><table className="rg-table min-w-[1000px]"><thead><tr><th>Created</th><th>Recipient</th><th>Channel</th><th>Notification</th><th>Status</th><th>Read</th></tr></thead><tbody>{data.rows.map(n => <tr key={n.id}><td className="whitespace-nowrap text-xs">{when(n.createdAt)}</td><td className="text-xs">{n.user.name}<br /><span className="text-neutral-500">{words(n.user.role)}</span></td><td>{n.notificationType === "PUSH" ? "In-app" : words(n.notificationType)}</td><td><p className="text-sm font-medium">{n.title}</p><p className="max-w-md truncate text-xs text-neutral-500" title={n.message}>{n.message}</p></td><td><Pill value={n.status} /></td><td className="text-xs">{n.readAt ? when(n.readAt) : "—"}</td></tr>)}</tbody></table></div><Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} /></> : <Empty title="No notifications match" />}</Section>
      <Section title="Templates" description="Stored templates for future provider delivery. Disabled templates will not be used once a provider is connected.">
        <div className="grid gap-4 p-4 md:grid-cols-3">{(["EMAIL", "SMS", "WHATSAPP"] as const).map(k => <div key={k}><p className="mb-2 text-xs font-semibold uppercase text-neutral-500">{words(k)}</p>{data.templates[k].length ? <ul className="space-y-2">{data.templates[k].map(t => <li key={t.id} className="rounded-lg border border-neutral-200 p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{t.name}</span><button className="rg-secondary !px-2 !py-1 text-xs" onClick={() => void toggle(k, t)}>{t.active ? "Disable" : "Enable"}</button></div><p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.preview}</p></li>)}</ul> : <p className="text-xs text-neutral-500">No templates stored.</p>}</div>)}</div>
      </Section>
    </>}
    {!data && !error && <p className="rg-card p-10 text-center text-sm text-neutral-500">Loading…</p>}
  </div></DashboardLayout>;
}
