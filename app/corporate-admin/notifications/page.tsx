"use client";
import { useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { API, DataState, Empty, Notice, PageHeader, Panel, qs, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Item = { id: string; title: string; message: string; readAt: string | null; createdAt: string };
type Channel = "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP";
type Center = {
  channels: { channel: Channel; label: string; status: string; detail: string }[];
  events: { key: string; label: string; audience: string; note: string | null; channels: Record<Channel, string> }[];
};
const ORDER: Channel[] = ["IN_APP", "PUSH", "EMAIL", "SMS", "WHATSAPP"];

export default function NotificationsPage() {
  const [page, setPage] = useState(1), [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error, reload } = useAdminData<{ items: Item[]; unread: number; page: number; hasMore: boolean; center: Center | null }>(`${API}/notifications${qs({ page, unread: unreadOnly ? 1 : null })}`);
  // The channel matrix comes with the first full page; keep it while paging or filtering.
  const [center, setCenter] = useState<Center | null>(null);
  useEffect(() => { if (data?.center) setCenter(data.center); }, [data]);
  const { busy, error: saveError, run } = useSubmit();
  async function mark(body: Record<string, unknown>) { if (await run(() => send("notifications", body))) void reload(); }
  return <>
    <PageHeader title="Notifications" description="Your in-app inbox and how each corporate travel event is delivered through RideGrid's central event, automation and notification pipeline.">
      <button className="rg-secondary" disabled={busy || !data?.unread} onClick={() => mark({ all: true })}><CheckCheck size={15}/>Mark all read</button>
    </PageHeader>
    {saveError && <Notice tone="error">{saveError}</Notice>}
    {center && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{center.channels.map((c) => <div key={c.channel} className="rg-card p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{c.label}</p><Status value={c.status}/></div><p className="mt-2 text-xs text-neutral-500">{c.detail}</p></div>)}</div>
      <Panel title="Events and channels" description="Real delivery state per channel. Email, SMS and WhatsApp are not connected yet; nothing is sent on them.">
        <div className="overflow-x-auto"><table className="rg-table">
          <thead><tr><th>Event</th><th>Who is notified</th>{ORDER.map((c) => <th key={c}>{center.channels.find((x) => x.channel === c)?.label}</th>)}</tr></thead>
          <tbody>{center.events.map((e) => <tr key={e.key}><td className="font-medium">{e.label}{e.note && <p className="max-w-64 text-xs font-normal text-neutral-500">{e.note}</p>}</td><td className="text-xs text-neutral-600">{e.audience}</td>{ORDER.map((c) => <td key={c}><Status value={e.channels[c]}/></td>)}</tr>)}</tbody>
        </table></div>
      </Panel>
    </>}
    <Panel title={data ? `Inbox · ${data.unread} unread` : "Inbox"} action={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}/>Unread only</label>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <>
        <ul className="divide-y divide-neutral-100">{data.items.map((n) => <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.readAt ? "" : "bg-red-50/40"}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-red-600"}`} aria-hidden/>
          <div className="min-w-0 flex-1"><p className={`text-sm ${n.readAt ? "" : "font-semibold"}`}>{n.title}</p><p className="mt-0.5 text-sm text-neutral-600">{n.message}</p><p className="mt-1 text-xs text-neutral-500">{when(n.createdAt)}{n.readAt ? "" : " · unread"}</p></div>
          {!n.readAt && <button className="rg-secondary" disabled={busy} onClick={() => mark({ id: n.id })}>Mark read</button>}
        </li>)}</ul>
        <div className="flex justify-between border-t border-neutral-100 px-5 py-3"><button className="rg-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button><button className="rg-secondary" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Older</button></div>
      </> : <Empty>You&apos;re all caught up.</Empty>)}</DataState>
    </Panel>
  </>;
}
