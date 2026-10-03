"use client";
import { useState } from "react";
import type { syncRealEntities } from "@/lib/website-seo/entities/real-sync";
type Report = Awaited<ReturnType<typeof syncRealEntities>>;
export default function RealEntitySync({ onSync }: { onSync?: () => void }) {
  const [report,setReport] = useState<Report | null>(null), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [pilot,setPilot] = useState("");
  async function preparePilot() {
    setBusy(true); setError(""); setPilot("");
    try {
      const response = await fetch("/api/website-seo/entities/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preparePilot" }) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Pilot preparation failed.");
      setPilot(`Pilot prepared: ${body.data.count} routes. Open Runs to review the draft. No generation or publishing was started.`); onSync?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Pilot preparation failed."); } finally { setBusy(false); }
  }
  async function run(dryRun: boolean, offset = 0) {
    setBusy(true); setError("");
    try { const response = await fetch("/api/website-seo/entities/sync", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ dryRun, offset }) }); const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.error || "Sync failed."); setReport(body.data); if (!dryRun) onSync?.(); }
    catch(e) { setError(e instanceof Error ? e.message : "Sync failed."); } finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-lg font-black">Sync Real RideGrid Entities</h2><p className="text-sm text-zinc-600">Use live marketplace locations, supported routes/services, airports and available vehicle categories. New entities remain drafts. Each request handles up to 100 entities.</p><div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={() => void run(true)}>Preview real sources</button><button disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={() => void run(false)}>Sync real entities</button><button disabled={busy} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={() => void preparePilot()}>Prepare real Pilot 10</button>{report?.nextOffset !== null && report?.nextOffset !== undefined && <button disabled={busy} className="rounded-lg border px-4 py-2 text-sm font-bold" onClick={() => void run(report.dryRun, report.nextOffset!)}>Next batch</button>}</div>{pilot && <p role="status" className="text-sm text-emerald-800">{pilot}</p>}{busy && <p role="status">Checking real RideGrid sources...</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{report && <div className="text-sm"><p>{report.dryRun ? "Preview" : "Sync"}: Created {report.created} / Updated {report.updated} / Unchanged {report.unchanged} / Skipped {report.skipped} / Errors {report.errors.length}</p><p className="mt-2">{Object.entries(report.families).map(([family,count]) => `${family}: ${count}`).join(" | ")}</p>{report.notes.map(n => <p key={n} className="mt-2 text-zinc-500">{n}</p>)}{report.errors.map(e => <p role="alert" key={e}>{e}</p>)}</div>}</section>;
}
