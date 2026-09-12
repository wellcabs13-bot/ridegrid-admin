"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import { WEBSITE_ENTITY_STATUSES, type WebsiteEntityType, type CreateWebsiteEntityInput } from "@/lib/website-seo/entities/types";
import { FACTORY_TYPES, FACTORY_FIELD_LABELS } from "@/lib/website-seo/page-factory/config";
import { ensureFactoryPage, factoryApi, generateFactoryPackage, record, storedStage } from "@/lib/website-seo/page-factory/client";
import type { FactoryEntity, FactoryKeyword, FactoryRun, KeywordResult, ContentResult, SeoResult, ReadinessResult } from "@/lib/website-seo/page-factory/types";
import { buttonClass, primaryClass, inputClass, FactoryHeading, Feedback, Handoff, ReadinessPanel, ResultDetails, RunDetails, useFactoryInventory } from "./shared";
import GenerationPreview, { type GenerationPreviewValue } from "./GenerationPreview";

type Action = "page" | "keywords" | "content" | "seo" | "readiness" | "package";

export default function EntityFactoryClient({ entityType }: { entityType: WebsiteEntityType }) {
  const config = FACTORY_TYPES.find((type) => type.type === entityType)!;
  const { data, loading, error: loadError, reload } = useFactoryInventory();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pageFilter, setPageFilter] = useState("");
  const [entityId, setEntityId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [pageId, setPageId] = useState("");
  const [keywords, setKeywords] = useState<FactoryKeyword[] | null>(null);
  const [keywordError, setKeywordError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<GenerationPreviewValue | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [run, setRun] = useState<FactoryRun | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const selected = data?.entities.find((entity) => entity.id === entityId && entity.type === entityType);
  const pages = data?.pages.filter((page) => page.entityId === entityId) ?? [];
  const page = pages.find((row) => row.id === pageId);
  const templates = data?.templates.filter((template) => template.entityType === entityType) ?? [];
  const availableTemplate = templateId ? templates.some((t) => t.id === templateId && t.status === "ACTIVE") : templates.some((t) => t.status === "ACTIVE");
  const disabled = loading || busy || Boolean(loadError);
  const inventory = (data?.entities ?? []).filter((entity) => entity.type === entityType && (!status || entity.status === status) &&
    (!search.trim() || `${entity.name} ${entity.slug}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (!pageFilter || (pageFilter === "with" ? data?.pages.some((p) => p.entityId === entity.id) : !data?.pages.some((p) => p.entityId === entity.id))));

  useEffect(() => { setEntityId(new URLSearchParams(window.location.search).get("entityId") || ""); }, []);
  useEffect(() => {
    let cancelled = false;
    setKeywords(null); setKeywordError("");
    if (entityId) void factoryApi<FactoryKeyword[]>(`keywords?entityId=${encodeURIComponent(entityId)}`).then((rows) => { if (!cancelled) setKeywords(rows); }).catch((failure: unknown) => { if (!cancelled) setKeywordError(failure instanceof Error ? failure.message : "Unable to read keywords."); });
    return () => { cancelled = true; };
  }, [entityId]);
  useEffect(() => {
    if (!data || !entityId) return;
    const candidates = data.pages.filter((row) => row.entityId === entityId);
    if (!candidates.some((row) => row.id === pageId)) setPageId(candidates.length === 1 ? candidates[0].id : "");
  }, [data, entityId, pageId]);

  function chooseEntity(id: string) {
    setEntityId(id); setTemplateId(""); setPageId(""); setPreview(null); setReadiness(null); setRun(null); setError(""); setNotice("");
  }
  async function refresh() {
    await reload();
    if (entityId) {
      try { setKeywords(await factoryApi<FactoryKeyword[]>(`keywords?entityId=${encodeURIComponent(entityId)}`)); setKeywordError(""); }
      catch (failure) { setKeywords(null); setKeywordError(failure instanceof Error ? failure.message : "Unable to reload keywords."); }
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = new FormData(event.currentTarget);
    const metadata: Record<string, string> = {};
    for (const field of config.fields) { const value = String(form.get(field) || "").trim(); if (value) metadata[field] = value; }
    const input: CreateWebsiteEntityInput = { type: entityType, name: String(form.get("name") || "").trim(), status: WEBSITE_ENTITY_STATUSES.find((value) => value === form.get("status")) ?? "DRAFT",
      ...(String(form.get("slug") || "").trim() ? { slug: String(form.get("slug")).trim() } : {}),
      ...(form.get("parentId") ? { parentId: String(form.get("parentId")) } : {}),
      ...(Object.keys(metadata).length ? { metadata } : {}),
    };
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const entity = await factoryApi<FactoryEntity>("entities", input);
      formRef.current?.reset(); chooseEntity(entity.id); setSearch(""); setStatus(""); setPageFilter("");
      setNotice("Entity created. Generate its page when ready.");
      await reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to create entity."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function operate(action: Action, persist = false) {
    if (!selected || locked.current) return;
    locked.current = true; setBusy(true); setError(""); setNotice(""); setPreview(null); setReadiness(null); setRun(null);
    try {
      if (action === "package") {
        const result = await generateFactoryPackage(entityId, "PACKAGE", templateId || undefined, setRun);
        if (result.page) setPageId(result.page.id);
        const readinessData = result.steps.readiness.data;
        if (readinessData) setReadiness(readinessData as ReadinessResult);
        setNotice(result.error ? "Package stopped with issues. Review each step below." : "Page package prepared. Continue in Publishing Manager.");
      } else if (action === "page") {
        const result = await ensureFactoryPage(entityId, templateId || undefined);
        setPageId(result.page.id); setNotice(result.reused ? "Existing page reused; its content and lifecycle were preserved." : "Page generated and persisted.");
      } else if (action === "keywords") {
        const result = await factoryApi<KeywordResult>("keywords/generate", { entityId, persist });
        setPreview({ kind: "keywords", result });
        setNotice(result.persistence ? `${result.persistence.created} keywords created; ${result.persistence.preserved} preserved.` : "Keyword preview only. Nothing persisted.");
      } else {
        if (!page) throw new Error("Select a generated page first.");
        if (action === "readiness") setReadiness(await factoryApi<ReadinessResult>("publishing/preview", { entityId, pageId: page.id }));
        else {
          const generated: GenerationPreviewValue = action === "content" ? { kind: "content", result: await factoryApi<ContentResult>("content/generate", { entityId, pageId: page.id, persist }) } : { kind: "seo", result: await factoryApi<SeoResult>("seo/generate", { entityId, pageId: page.id, persist }) };
          const result = generated.result;
          setPreview(generated);
          setNotice(result.persistence.status === "SKIPPED" ? `Persistence skipped: ${result.persistence.reason}` : `${action === "content" ? "Content" : "SEO"}: ${result.persistence.status}.`);
        }
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Factory operation failed."); }
    finally {
      try { await refresh(); } catch { setError((previous) => `${previous ? `${previous} ` : ""}State reload failed. Reload before another operation.`); }
      locked.current = false; setBusy(false);
    }
  }

  const pipeline = [
    ["ENTITY", selected ? "COMPLETE" : "NOT STARTED"], ["PAGE", page ? "COMPLETE" : availableTemplate ? "READY" : "BLOCKED"],
    ["KEYWORDS", keywordError ? "UNAVAILABLE" : keywords === null ? "LOADING" : keywords.length ? `${keywords.length} STORED` : "NOT STARTED"],
    ["CONTENT", storedStage(page, "contentW5") ? "COMPLETE" : page?.status === "DRAFT" ? "READY" : "BLOCKED"],
    ["SEO", storedStage(page, "seoW6") ? "COMPLETE" : page && !["PUBLISHED", "ARCHIVED"].includes(page.status) ? "READY" : "BLOCKED"],
    ["READINESS", readiness ? readiness.readiness.ready ? "READY" : "BLOCKED" : "NOT CHECKED"],
    ["PUBLISHING HANDOFF", page ? "AVAILABLE" : "BLOCKED"],
  ];
  return <><FactoryHeading title={`${config.label} Factory`} description={config.help} action={<button className={buttonClass} disabled={loading || busy} onClick={() => { setReadiness(null); setRun(null); void refresh().catch(() => undefined); }}>Reload</button>} />
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 lg:px-8"><Feedback error={error || loadError || keywordError} notice={notice} />
      {loading && <p role="status">Loading factory state…</p>}
      <WebsiteSeoCard><h2 className="text-lg font-black">Create {entityType.toLowerCase()} entity</h2><p className="mt-1 text-sm text-zinc-500">Website SEO entity. Supply real identity and location details.</p>
        <form ref={formRef} onSubmit={(event) => void create(event)} className="mt-4"><fieldset disabled={disabled || !data} className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-3 disabled:opacity-60">
          <label className="text-sm font-bold">Name<input name="name" required minLength={2} className={inputClass} /></label>
          <label className="text-sm font-bold">Slug (optional)<input name="slug" className={inputClass} placeholder="Generated from name" /></label>
          <label className="text-sm font-bold">Status<select name="status" defaultValue="DRAFT" className={inputClass}>{WEBSITE_ENTITY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm font-bold">Parent (optional)<select name="parentId" defaultValue="" className={inputClass}><option value="">No parent</option>{data?.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.type}</option>)}</select></label>
          {config.fields.map((field) => <label key={field} className="text-sm font-bold">{FACTORY_FIELD_LABELS[field]} (optional)<input name={field} maxLength={160} className={inputClass} /></label>)}
          <button type="submit" className={primaryClass}>{busy ? "Working…" : "Create entity"}</button>
        </fieldset></form>
      </WebsiteSeoCard>
      <div className="grid items-start gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
        <WebsiteSeoCard><h2 className="text-lg font-black">Inventory</h2><div className="mt-3 space-y-3">
          <label className="block text-xs font-bold">Search<input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Name or slug" /></label>
          <label className="block text-xs font-bold">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}><option value="">All statuses</option>{WEBSITE_ENTITY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-xs font-bold">Page state<select value={pageFilter} onChange={(event) => setPageFilter(event.target.value)} className={inputClass}><option value="">All entities</option><option value="with">With pages</option><option value="without">Without pages</option></select></label>
          <p className="text-xs text-zinc-500">{inventory.length} shown</p>
          <div className="max-h-[640px] space-y-2 overflow-auto">{inventory.map((entity) => <button key={entity.id} type="button" disabled={disabled} aria-pressed={entity.id === entityId} onClick={() => chooseEntity(entity.id)} className={`w-full rounded-xl border p-3 text-left disabled:opacity-60 ${entity.id === entityId ? "border-red-500 bg-red-50" : "border-zinc-200 hover:border-zinc-400"}`}><span className="block font-bold">{entity.name}</span><span className="block break-all text-xs text-zinc-500">{entity.slug}</span><span className="mt-1 block text-xs">{entity.status} · {data?.pages.filter((p) => p.entityId === entity.id).length} pages</span></button>)}</div>
          {!loading && data && !inventory.length && <p className="text-sm text-zinc-500">No entities match. Create an entity or adjust the filters.</p>}
        </div></WebsiteSeoCard>
        <div className="min-w-0 space-y-5">{!selected ? <WebsiteSeoCard><p className="text-sm text-zinc-500">Select an entity to view its page pipeline.</p></WebsiteSeoCard> : <>
          <WebsiteSeoCard><h2 className="text-xl font-black">{selected.name}</h2><p className="mt-2 break-all text-sm text-zinc-500">{selected.slug} · {selected.status}</p>
            {selected.parentId && <p className="mt-2 text-sm">Parent: {data?.entities.find((e) => e.id === selected.parentId)?.name || selected.parentId}</p>}
            {selected.sourceId && <p className="mt-2 break-all text-sm">Source ID: {selected.sourceId}</p>}
            {selected.metadata && <div className="mt-3"><ResultDetails title="Entity metadata" data={selected.metadata} /></div>}
            <div className="my-4 flex flex-wrap gap-2">{pipeline.map(([label, state], index) => <div key={label} className="rounded-lg bg-zinc-100 px-3 py-2"><p className="text-[10px] font-black text-zinc-500">{index + 1}. {label}</p><p className="text-xs font-bold">{state}</p></div>)}</div>
            <p className="text-xs text-zinc-500">COMPLETE means a stored engine artifact exists; editorial quality and publication readiness are evaluated separately.</p>
            <fieldset disabled={disabled} className="mt-4 space-y-4 disabled:opacity-60">
              <label className="block text-sm font-bold">Template for page generation<select value={templateId} onChange={(event) => { setTemplateId(event.target.value); setRun(null); }} className={inputClass}><option value="">Automatic active template (existing page reused if unambiguous)</option>{templates.map((template) => <option key={template.id} value={template.id} disabled={template.status !== "ACTIVE"}>{template.name} · {template.status} · {template.pathPattern}</option>)}</select></label>
              {!availableTemplate && <p className="text-sm text-red-700">An ACTIVE matching template is required. Configure it in Website Manager → Templates.</p>}
              <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={!availableTemplate} onClick={() => void operate("page")}>Generate / use page</button><button type="button" className={primaryClass} disabled={!availableTemplate} onClick={() => void operate("package")}>Generate Page Package</button></div>
              <p className="text-xs leading-5 text-zinc-500">Generate Page Package explicitly saves page, keywords, content and SEO, then checks readiness. Existing pages are reused. Each engine’s editorial protections remain in effect.</p>
              <label className="block text-sm font-bold">Page for individual steps<select value={pageId} onChange={(event) => { setPageId(event.target.value); setPreview(null); setReadiness(null); setRun(null); }} className={inputClass}><option value="">Select a page</option>{pages.map((row) => <option key={row.id} value={row.id}>{row.pathname} · {row.status} · {row.template.name}</option>)}</select></label>
              {page && <p className="break-all text-sm">{page.pathname} · <strong>{page.status}</strong></p>}
              <div className="space-y-3">{(["keywords", "content", "seo"] as const).map((action) => <div key={action} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-3"><span className="mr-auto text-sm font-black uppercase">{action}</span><button type="button" className={buttonClass} disabled={action !== "keywords" && !page} onClick={() => void operate(action, false)}>Preview</button><button type="button" className={buttonClass} disabled={action !== "keywords" && !page} onClick={() => void operate(action, true)}>Generate &amp; persist</button></div>)}</div>
              <button type="button" disabled={!page} className={buttonClass} onClick={() => void operate("readiness")}>Check readiness</button>
              <p className="text-xs text-zinc-500">Preview does not save. Generate &amp; persist generates a fresh result and asks the existing engine to save it.</p>
            </fieldset>
          </WebsiteSeoCard>
          {busy && <p role="status" className="text-sm font-bold">Processing the current operation…</p>}
          {run && <WebsiteSeoCard><h3 className="mb-3 font-black">Package results</h3><RunDetails run={run} /></WebsiteSeoCard>}
          {preview && <GenerationPreview value={preview} />}
          {readiness && <ReadinessPanel result={readiness} />}
          {keywords && <WebsiteSeoCard><h3 className="font-black">Stored keywords ({keywords.length})</h3>{keywords.length ? <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">{keywords.map((keyword) => <li key={keyword.id}>{keyword.keyword} <span className="text-xs text-zinc-500">· {keyword.type} · {keyword.status}</span></li>)}</ul> : <p className="mt-2 text-sm text-zinc-500">No stored keywords yet.</p>}</WebsiteSeoCard>}
          {page && <div className="space-y-3">{storedStage(page, "contentW5") && <ResultDetails title="Stored content" data={record(page.metadata).contentW5} />}{storedStage(page, "seoW6") && <ResultDetails title="Stored SEO" data={record(page.metadata).seoW6} />}</div>}
          <Handoff />
        </>}</div>
      </div>
    </div></>;
}
