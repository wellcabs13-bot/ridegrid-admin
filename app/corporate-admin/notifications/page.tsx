"use client";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { API, DataState, Empty, Notice, PageHeader, Panel, qs, send, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Item = { id: string; title: string; message: string; readAt: string | null; createdAt: string };

export default function NotificationsPage() {
  const [page, setPage] = useState(1), [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error, reload } = useAdminData<{ items: Item[]; unread: number; page: number; hasMore: boolean }>(`${API}/notifications${qs({ page, unread: unreadOnly ? 1 : null })}`);
  const { busy, error: saveError, run } = useSubmit();
  async function mark(body: Record<string, unknown>) { if (await run(() => send("notifications", body))) void reload(); }
  return <>
    <PageHeader title="Notifications" description="Alerts sent to you by RideGrid, such as new approval requests from employees.">
      <button className="rg-secondary" disabled={busy || !data?.unread} onClick={() => mark({ all: true })}><CheckCheck size={15}/>Mark all read</button>
    </PageHeader>
    {saveError && <Notice tone="error">{saveError}</Notice>}
    <Panel title={data ? `${data.unread} unread` : "Inbox"} action={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}/>Unread only</label>}>
      <DataState loading={loading} error={error} onRetry={reload}>{data && (data.items.length ? <>
        <ul className="divide-y divide-neutral-100">{data.items.map((n) => <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.readAt ? "" : "bg-red-50/40"}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-red-600"}`} aria-hidden/>
          <div className="min-w-0 flex-1"><p className={`text-sm ${n.readAt ? "" : "font-semibold"}`}>{n.title}</p><p className="mt-0.5 text-sm text-neutral-600">{n.message}</p><p className="mt-1 text-xs text-neutral-500">{when(n.createdAt)}{n.readAt ? "" : " · unread"}</p></div>
          {!n.readAt && <button className="rg-secondary" disabled={busy} onClick={() => mark({ id: n.id })}>Mark read</button>}
        </li>)}</ul>
        <div className="flex justify-between border-t border-neutral-100 px-5 py-3"><button className="rg-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button><button className="rg-secondary" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Older</button></div>
      </> : <Empty>You&apos;re all caught up.</Empty>)}</DataState>
    </Panel>
    <p className="text-xs text-neutral-500">Approval requests: open the Approvals page to act on them. Notifications carry no direct link unless RideGrid records one.</p>
  </>;
}
