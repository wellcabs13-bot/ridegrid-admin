"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Empty, Notice, Pill, Section, num, send, when, words } from "@/components/admin/kit";

type RuleStatus = "ACTIVE" | "DISABLED" | "NOT_CONFIGURED" | "FAILED";
type Rule = {
  id: string; name: string; description: string; trigger: string; action: string; recipient: string | null; channel: string;
  status: RuleStatus; enabled: boolean; requires: string | null; executed30d: number; failed30d: number; lastRunAt: string | null; lastError: string | null;
};
type View = {
  workflows: { trigger: string; when: string; builtIn: string[]; rules: { id: string; name: string; status: RuleStatus }[]; last30: Record<string, number> }[];
  otherEvents: { eventType: string; status: string; count: number }[];
  failed: { id: string; eventType: string; module: string; bookingId: string | null; errorMessage: string | null; createdAt: string }[];
  retry: { status: string; count: number }[];
  rules: Rule[];
};

const RECIPIENT: Record<string, string> = {
  TRAVELLER: "Traveller / employee", VENDOR: "Vendor", DRIVER: "Assigned driver", CORPORATE_APPROVERS: "Company approvers", FINANCE_TEAM: "Super Admin & Finance",
};

export default function AutomationPage() {
  const { data, loading, error, reload } = useAdminData<View>("/api/admin/platform?view=automation");
  const [busy, setBusy] = useState<string | null>(null); const [notice, setNotice] = useState(""); const [err, setErr] = useState("");
  const pendingRetries = data?.retry.find(r => r.status === "PENDING")?.count ?? 0;
  const runRetry = async () => {
    setBusy("retry"); setErr("");
    try { const r = await send<{ processed: number; completed: number; failed: number }>("/api/admin/platform", "POST", { action: "process-retry-queue" }); setNotice(`Retry run: ${r.processed} processed, ${r.completed} completed, ${r.failed} failed.`); reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Retry failed."); } finally { setBusy(null); }
  };
  const toggle = async (rule: Rule) => {
    setBusy(rule.id); setErr("");
    try { await send("/api/admin/platform", "POST", { action: "rule-enabled", id: rule.id, enabled: !rule.enabled }); setNotice(`${rule.name} ${rule.enabled ? "disabled" : "enabled"}.`); reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Update failed."); } finally { setBusy(null); }
  };
  const counts = (data?.rules ?? []).reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {} as Record<string, number>);
  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Automation" description="Internal automation rules run by the central event pipeline: event → rule → in-app notification. Email, SMS and WhatsApp providers are not connected yet.">
      <button className="rg-secondary" onClick={reload} disabled={loading}>Refresh</button>
      <button className="rg-primary" onClick={() => void runRetry()} disabled={!!busy || !pendingRetries}>{busy === "retry" ? "Retrying…" : `Retry failed events (${pendingRetries})`}</button>
    </PageHeading>
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}
    {err && <Notice tone="error">{err}</Notice>}
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && <>
      <Section title="Automation rules" description={`${num(counts.ACTIVE ?? 0)} active · ${num(counts.DISABLED ?? 0)} disabled · ${num(counts.FAILED ?? 0)} failed · ${num(counts.NOT_CONFIGURED ?? 0)} not configured. Executions are counted over the last 30 days.`}>
        <div className="overflow-x-auto"><table className="rg-table min-w-[1000px]"><thead><tr><th>Rule</th><th>Trigger</th><th>Recipient · channel</th><th>Status</th><th>Last 30 days</th><th>Last run</th><th /></tr></thead><tbody>{data.rules.map(r => <tr key={r.id}>
          <td><p className="font-medium">{r.name}</p><p className="text-xs text-neutral-500">{r.id} · {r.description}</p></td>
          <td className="text-xs">{words(r.trigger)}</td>
          <td className="text-xs">{r.recipient ? RECIPIENT[r.recipient] ?? words(r.recipient) : "—"} · {r.channel}</td>
          <td><Pill value={r.status} />{r.requires && <p className="mt-1 max-w-[220px] text-[11px] text-neutral-500">Needs: {r.requires}</p>}{r.status === "FAILED" && r.lastError && <p className="mt-1 max-w-[260px] text-[11px] text-red-700">{r.lastError}</p>}</td>
          <td className="whitespace-nowrap text-xs">{r.requires ? "—" : <>{num(r.executed30d)} run{r.failed30d > 0 && <span className="text-red-700"> · {num(r.failed30d)} failed</span>}</>}</td>
          <td className="whitespace-nowrap text-xs">{when(r.lastRunAt)}</td>
          <td>{!r.requires && <button className="rg-secondary whitespace-nowrap text-xs" disabled={!!busy} onClick={() => void toggle(r)}>{busy === r.id ? "Saving…" : r.enabled ? "Disable" : "Enable"}</button>}</td>
        </tr>)}</tbody></table></div>
      </Section>
      <Section title="Event workflows" description="Where each central event comes from and what it triggers. Counts are events stored in the last 30 days.">
        <div className="overflow-x-auto"><table className="rg-table min-w-[900px]"><thead><tr><th>Event</th><th>When</th><th>Automation rules</th><th>Done by the workflow itself</th><th>Last 30 days</th></tr></thead><tbody>{data.workflows.map(w => <tr key={w.trigger}>
          <td className="font-medium">{words(w.trigger)}</td>
          <td className="text-xs text-neutral-500">{w.when}</td>
          <td className="text-xs">{w.rules.length ? <ul className="space-y-1">{w.rules.map(r => <li key={r.id} className="flex items-center gap-2"><Pill value={r.status} />{r.name}</li>)}</ul> : <span className="text-neutral-500">None — event recorded and audited</span>}</td>
          <td className="text-xs">{w.builtIn.length ? <ul className="list-disc pl-4">{w.builtIn.map(a => <li key={a}>{a}</li>)}</ul> : "—"}</td>
          <td className="text-xs">{Object.keys(w.last30).length ? Object.entries(w.last30).map(([s, c]) => <span key={s} className="mr-2 inline-flex items-center gap-1"><Pill value={s} />{num(c)}</span>) : "No events"}</td>
        </tr>)}</tbody></table></div>
      </Section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Failed events" description="Events whose processing failed. They are queued for retry (up to 3 attempts); rules that already succeeded are not repeated.">{data.failed.length ? <ul className="divide-y divide-slate-200 text-sm">{data.failed.map(e => <li key={e.id} className="px-5 py-2"><div className="flex justify-between gap-2"><span>{words(e.eventType)} · {e.module}</span><span className="text-xs text-neutral-500">{when(e.createdAt)}</span></div><p className="break-words text-xs text-red-700">{e.errorMessage ?? "No error recorded"}</p>{e.bookingId && <Link href={`/bookings?id=${encodeURIComponent(e.bookingId)}`} className="text-xs text-red-700 underline">Open booking</Link>}</li>)}</ul> : <Empty title="No failed events" />}</Section>
        <Section title="Retry queue">{data.retry.length ? <ul className="space-y-2 px-5 py-3 text-sm">{data.retry.map(r => <li key={r.status} className="flex justify-between"><Pill value={r.status} /><span>{num(r.count)}</span></li>)}</ul> : <Empty title="Retry queue is empty" />}</Section>
      </div>
      {data.otherEvents.length > 0 && <Section title="Other recorded events (30 days)"><ul className="flex flex-wrap gap-2 px-5 py-3 text-xs">{data.otherEvents.map(e => <li key={e.eventType + e.status} className="rounded-md border border-neutral-200 px-2 py-1">{words(e.eventType)} · {words(e.status)} · {num(e.count)}</li>)}</ul></Section>}
    </>}</DataState>
  </div></DashboardLayout>;
}
