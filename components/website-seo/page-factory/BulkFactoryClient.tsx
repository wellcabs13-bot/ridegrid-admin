"use client";

import { useEffect, useRef, useState } from "react";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import { WEBSITE_ENTITY_STATUSES } from "@/lib/website-seo/entities/types";
import { FACTORY_BATCH_LIMIT, FACTORY_TYPES } from "@/lib/website-seo/page-factory/config";
import { generateFactoryPackage } from "@/lib/website-seo/page-factory/client";
import { FACTORY_STEPS, type FactoryRun } from "@/lib/website-seo/page-factory/types";
import { buttonClass, primaryClass, inputClass, FactoryHeading, Feedback, Handoff, RunDetails, useFactoryInventory } from "./shared";

export default function BulkFactoryClient() {
  const { data, loading, error: loadError, reload } = useFactoryInventory();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [runs, setRuns] = useState<Record<string, FactoryRun>>({});
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState(0);
  const [currentId, setCurrentId] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const filtered = (data?.entities ?? []).filter((entity) => (!type || entity.type === type) && (!status || entity.status === status) && (!search.trim() || `${entity.name} ${entity.slug}`.toLowerCase().includes(search.trim().toLowerCase())));
  const visible = filtered.slice(0, FACTORY_BATCH_LIMIT);
  const disabled = loading || busy || Boolean(loadError);

  function select(ids: string[]) {
    const unique = Array.from(new Set(ids));
    if (unique.length > FACTORY_BATCH_LIMIT) { setError(`Select at most ${FACTORY_BATCH_LIMIT} entities per run. Clear selection before selecting another set.`); return; }
    setSelected(unique); setError("");
  }
  async function execute(mode: "PAGE" | "PACKAGE") {
    if (locked.current || selected.length < 1 || selected.length > FACTORY_BATCH_LIMIT) return;
    locked.current = true; stop.current = false; setStopping(false); setBusy(true); setError(""); setNotice("");
    const ids = [...selected];
    setBatchIds(ids); setRuns({}); setCompleted(0); setExpandedId("");
    let finished = 0;
    let failed = 0;
    let refreshFailed = false;
    try {
      for (const id of ids) {
        if (stop.current) break;
        setCurrentId(id);
        const result = await generateFactoryPackage(id, mode, undefined, (run) => setRuns((previous) => ({ ...previous, [id]: run })));
        if (result.error) failed++;
        finished++; setCompleted(finished);
        // Re-read real persisted state after each entity, including partial failures.
        try { await reload(); } catch { refreshFailed = true; }
      }
      setNotice(`${finished} of ${ids.length} entities processed; ${failed} with errors or blockers.${finished < ids.length ? " Remaining entities were not started." : ""}`);
      if (refreshFailed) setError("Some state reloads failed. The per-step API results are shown below; reload inventory before running again.");
    } finally { locked.current = false; setBusy(false); setCurrentId(""); }
  }

  return <><FactoryHeading title="Bulk Generator" description="Run bounded batches over existing Website SEO entities. Each entity is processed separately through the existing generation engines."
    action={<button className={buttonClass} disabled={busy || loading} onClick={() => void reload().catch(() => undefined)}>Reload</button>} />
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 lg:px-8"><Feedback error={error || loadError} notice={notice} />
      <WebsiteSeoCard><h2 className="text-lg font-black">Select entities</h2><p className="mt-2 text-sm text-zinc-500">Maximum {FACTORY_BATCH_LIMIT} entities per batch. Automatic template selection is used for new pages. Existing pages are reused; ambiguous page mappings require explicit selection in the entity factory.</p>
        <fieldset disabled={busy} className="mt-4 grid gap-3 md:grid-cols-3 disabled:opacity-60">
          <label className="text-sm font-bold">Search<input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Name or slug" /></label>
          <label className="text-sm font-bold">Entity type<select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}><option value="">All types</option>{FACTORY_TYPES.map((config) => <option key={config.type} value={config.type}>{config.label}</option>)}</select></label>
          <label className="text-sm font-bold">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}><option value="">All statuses</option>{WEBSITE_ENTITY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
        </fieldset>
        <div className="my-4 flex flex-wrap items-center gap-3"><button type="button" className={buttonClass} disabled={disabled || !visible.length} onClick={() => select([...selected, ...visible.map((entity) => entity.id)])}>Select visible</button><button type="button" className={buttonClass} disabled={busy} onClick={() => select([])}>Clear selection</button><p className="text-sm text-zinc-500">{selected.length}/{FACTORY_BATCH_LIMIT} selected · {visible.length} of {filtered.length} matches shown</p></div>
        {filtered.length > FACTORY_BATCH_LIMIT && <p className="mb-3 text-xs text-zinc-500">Showing the first {FACTORY_BATCH_LIMIT} matches. Narrow the filters to choose another group.</p>}
        {loading && !busy && <p role="status">Loading inventory…</p>}
        <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-zinc-100"><tr><th className="p-3">Select</th><th className="p-3">Entity</th><th className="p-3">Status</th><th className="p-3">Pages</th></tr></thead><tbody className="divide-y divide-zinc-100">{visible.map((entity) => <tr key={entity.id}><td className="p-3"><input type="checkbox" aria-label={`Select ${entity.name}`} checked={selected.includes(entity.id)} disabled={disabled} onChange={(event) => select(event.target.checked ? [...selected, entity.id] : selected.filter((id) => id !== entity.id))} /></td><td className="p-3"><p className="font-bold">{entity.name}</p><p className="text-xs text-zinc-500">{entity.type} · {entity.slug}</p></td><td className="p-3">{entity.status}</td><td className="p-3">{data?.pages.filter((page) => page.entityId === entity.id).length}</td></tr>)}</tbody></table></div>
        {!loading && data && !visible.length && <p className="py-6 text-center text-sm text-zinc-500">No entities match these filters.</p>}
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={disabled || !selected.length} className={buttonClass} onClick={() => void execute("PAGE")}>Generate Pages</button><button type="button" disabled={disabled || !selected.length} className={primaryClass} onClick={() => void execute("PACKAGE")}>Generate Page Packages</button>{busy && <button type="button" className={buttonClass} disabled={stopping} onClick={() => { stop.current = true; setStopping(true); }}>Stop after current entity</button>}</div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">Generate Page Packages explicitly persists page, keywords, content and SEO, then previews readiness. Processing stops for an entity when an engine blocks a prerequisite; remaining selected entities continue. Keep this task open while a batch runs.</p>
      </WebsiteSeoCard>
      {batchIds.length > 0 && <WebsiteSeoCard><h2 className="font-black">Batch results</h2><p role="status" className="my-3 text-sm">{completed}/{batchIds.length} processed{currentId ? ` · Current: ${data?.entities.find((e) => e.id === currentId)?.name || currentId}` : ""}</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-zinc-100"><tr><th className="p-3">Entity</th>{FACTORY_STEPS.map((step) => <th key={step} className="p-3 uppercase">{step}</th>)}<th className="p-3">Error / details</th></tr></thead><tbody className="divide-y divide-zinc-100">{batchIds.map((id) => <tr key={id}><td className="p-3 font-bold">{data?.entities.find((e) => e.id === id)?.name || id}</td>{FACTORY_STEPS.map((step) => <td key={step} className="p-3" title={runs[id]?.steps[step].message}>{runs[id]?.steps[step].state || "NOT STARTED"}{step === "page" && runs[id]?.page && <p className="mt-1 break-all text-zinc-500">{runs[id].page?.pathname}</p>}</td>)}<td className="max-w-xs p-3"><p>{runs[id]?.error || "—"}</p>{runs[id] && <button type="button" className="mt-2 font-bold text-red-600" onClick={() => setExpandedId(id)}>Inspect steps</button>}</td></tr>)}</tbody></table></div>
        {expandedId && runs[expandedId] && <div className="mt-5"><h3 className="mb-3 font-bold">{data?.entities.find((e) => e.id === expandedId)?.name}</h3><RunDetails run={runs[expandedId]} /></div>}
      </WebsiteSeoCard>}
      <Handoff />
    </div></>;
}
