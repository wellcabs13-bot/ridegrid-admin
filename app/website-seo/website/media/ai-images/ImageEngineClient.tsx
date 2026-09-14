"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import { IMAGE_SLOTS, type ImageAssignment, type ImageJob, type ImagePreset, type ImageSlot } from "@/lib/website-seo/media/ai-image/types";

type Overview = { jobs: ImageJob[]; assignments: ImageAssignment[]; presets: ImagePreset[]; autoGenerate: boolean;
  archivedJobs: { id: string; title: string; slot: string; status: string }[];
  environment: { configured: boolean; error: string | null; model: string; size: string; quality: string };
  pages: { id: string; pathname: string; entity: { name: string; type: string } }[];
  media: { id: string; title: string; url: string; status: string; altText: string; aiGenerated: boolean }[] };
const endpoint = "/api/website-seo/media/ai-images";
const button = "rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40";
const field = "w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-zinc-950";
async function request(body?: Record<string, unknown>) {
  const response = await fetch(endpoint, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.error || "Image operation failed."); return json.data;
}
export default function ImageEngineClient() {
  const [data, setData] = useState<Overview | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [pageIds, setPageIds] = useState<string[]>(["homepage"]), [slots, setSlots] = useState<ImageSlot[]>(["heroImage", "ogImage"]);
  const [presetId, setPresetId] = useState(""), [prompt, setPrompt] = useState(""), [altText, setAltText] = useState(""), [autoAssign, setAutoAssign] = useState(true);
  const [assignmentPage, setAssignmentPage] = useState("homepage"), [assignmentSlot, setAssignmentSlot] = useState<ImageSlot>("heroImage"), [assetId, setAssetId] = useState("");
  const [tab, setTab] = useState("Generate"), [filter, setFilter] = useState("ALL"), [presetDraft, setPresetDraft] = useState<ImagePreset | null>(null);
  const load = useCallback(async () => { setData(await request()); }, []);
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("pageId");
    if (selected) { setPageIds([selected]); setAssignmentPage(selected); }
    void load().catch(e => setError(e.message));
    const timer = setInterval(() => { void load().catch(() => {}); }, 10_000);
    return () => clearInterval(timer);
  }, [load]);
  async function act(body: Record<string, unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { const result = await request(body); await load(); setNotice(message); return result; }
    catch (e) { setError(e instanceof Error ? e.message : "Image operation failed."); }
    finally { setBusy(false); }
  }
  const toggle = <T,>(items: T[], item: T) => items.includes(item) ? items.filter(i => i !== item) : [...items, item];
  return <main className="mx-auto max-w-7xl space-y-6 p-6 text-zinc-950">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">AI Image Engine</h1><p className="text-sm text-zinc-500">Generate, review and assign RideGrid website images.</p></div><button className={button} disabled={busy} onClick={() => void load().catch(e => setError(e.message))}>Refresh</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{notice}</p>}
    {!data ? <p>Loading image engine…</p> : <>
      {data.environment.error && <p role="alert" className="rounded-lg border border-red-200 p-4 text-red-700">{data.environment.error}</p>}
      <p className="text-sm text-zinc-500">{data.environment.model} · {data.environment.size} · Quality: high for homepage/major heroes, medium for page heroes, low for supporting images · {data.jobs.filter(j => j.status === "QUEUED").length} queued · {data.jobs.filter(j => j.status === "GENERATED").length} awaiting review</p>
      <nav aria-label="Image engine sections" className="flex flex-wrap gap-2">{["Generate", "Jobs", "Assignments", "Presets"].map(t => <button key={t} className={`${button} ${tab === t ? "!bg-red-600" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</nav>
      {tab === "Generate" && <WebsiteSeoCard><div className="space-y-4">
        <h2 className="text-lg font-bold">Generate images for selected pages</h2>
        <label className="block text-sm font-semibold">Pages (up to 25)<select multiple className={`${field} mt-1 h-40`} value={pageIds} onChange={e => { setPageIds(Array.from(e.target.selectedOptions, o => o.value)); setPrompt(""); }}>{data.pages.map(p => <option key={p.id} value={p.id}>{p.entity.name} · {p.pathname}</option>)}</select></label>
        <fieldset><legend className="text-sm font-semibold">Image slots</legend><div className="mt-2 flex flex-wrap gap-4">{IMAGE_SLOTS.map(slot => <label key={slot} className="text-sm"><input type="checkbox" checked={slots.includes(slot)} onChange={() => { setSlots(toggle(slots, slot)); setPrompt(""); }} /> {slot}</label>)}</div></fieldset>
        <label className="block text-sm font-semibold">Style preset<select className={field} value={presetId} onChange={e => { setPresetId(e.target.value); setPrompt(""); }}><option value="">Recommended for each page family</option>{data.presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <button className={button} disabled={busy || pageIds.length !== 1 || slots.length !== 1} onClick={async () => { const result = await act({ action: "preview", pageId: pageIds[0], slot: slots[0], ...(presetId ? { presetId } : {}) }, "Prompt ready to review."); if (result) setPrompt(result.prompt); }}>Build prompt (select one page and slot)</button>
        <label className="block text-sm font-semibold">Prompt override (single image only)<textarea className={field} rows={5} maxLength={8000} value={prompt} disabled={pageIds.length !== 1 || slots.length !== 1} onChange={e => setPrompt(e.target.value)} placeholder="Leave blank to build a matching prompt for each page and slot." /></label>
        <label className="block text-sm font-semibold">Alt text override (single image only)<input className={field} maxLength={500} value={altText} onChange={e => setAltText(e.target.value)} disabled={pageIds.length !== 1 || slots.length !== 1} /></label>
        <label className="block text-sm"><input type="checkbox" checked={autoAssign} onChange={e => setAutoAssign(e.target.checked)} /> Assign to the requested slot when approved</label>
        <p className="text-sm text-zinc-500">Generation uses your OpenAI account. Images remain in review until approved. The image worker processes the durable queue even when this page is closed.</p>
        <button className={`${button} !bg-red-600`} disabled={busy || !data.environment.configured || !pageIds.length || !slots.length || pageIds.length > 25 || pageIds.length * slots.length > 100} onClick={async () => { const result = await act({ action: "queue", pageIds, slots, autoAssign, ...(presetId ? { presetId } : {}), ...(prompt && pageIds.length * slots.length === 1 ? { prompt } : {}), ...(altText && pageIds.length * slots.length === 1 ? { altText } : {}) }, "Generation jobs queued. Existing jobs are kept."); if (result) setTab("Jobs"); }}>Queue {pageIds.length * slots.length} images</button>
        <div className="border-t pt-4"><label className="text-sm"><input type="checkbox" checked={data.autoGenerate} disabled={busy} onChange={e => void act({ action: "settings", autoGenerate: e.target.checked, presets: data.presets }, "Page creation image automation updated.")} /> Automatically queue hero and OG images for new Page Factory pages</label></div>
      </div></WebsiteSeoCard>}
      {tab === "Jobs" && <div className="space-y-4"><label className="block text-sm">Status<select className={field} value={filter} onChange={e => setFilter(e.target.value)}>{["ALL", "QUEUED", "PROCESSING", "GENERATED", "APPROVED", "REJECTED", "FAILED"].map(s => <option key={s}>{s}</option>)}</select></label>
        {!data.jobs.length && <p>No generation jobs yet.</p>}
        {data.archivedJobs.length > 0 && <details className="rounded-lg border border-zinc-200 p-4"><summary>Archived jobs (most recent 100)</summary>{data.archivedJobs.map(j => <div key={j.id} className="mt-3 flex items-center justify-between gap-3 text-sm"><span>{j.title} · {j.slot} · {j.status}</span><button className={button} disabled={busy} onClick={() => void act({ action: "restore", id: j.id }, "Job restored. Approved images can be reused in Assignments.")}>Restore</button></div>)}</details>}
        {data.jobs.filter(j => filter === "ALL" || j.status === filter).slice().reverse().map(job => <WebsiteSeoCard key={job.id}><div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div>{job.assetId ? <Image src={`/api/files/${job.assetId}`} alt={job.altText} width={240} height={160} unoptimized className="rounded-lg object-cover" /> : <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-100 text-sm">{job.status}</div>}</div>
          <div className="space-y-2"><h3 className="font-bold">{job.target.title} · {job.slot}</h3><p className="text-sm">{job.status} · {job.preset.name} · {job.model} · {job.width ? `${job.width} × ${job.height}` : job.size}</p><p className="text-sm text-zinc-500">{job.altText}</p>{job.error && <p role="alert" className="text-sm text-red-700">{job.error}</p>}
            <details className="text-sm"><summary>Prompt and provenance</summary><p className="whitespace-pre-wrap">{job.prompt}</p><p>Avoid: {job.negativePrompt}</p><p>{job.filename} · {job.provider} · Created {new Date(job.createdAt).toLocaleString()} · {job.createdBy}</p></details>
            <div className="flex flex-wrap gap-2">{job.status === "GENERATED" && <button className={`${button} !bg-red-600`} disabled={busy} onClick={() => void act({ action: "approve", id: job.id }, "Image approved; requested assignment applied if enabled.")}>Approve{job.autoAssign ? " & assign" : ""}</button>}
              {["GENERATED", "APPROVED", "QUEUED"].includes(job.status) && <button className={button} disabled={busy} onClick={() => void act({ action: "reject", id: job.id }, "Image rejected and its assignments removed.")}>Reject</button>}
              {!["PROCESSING", "QUEUED"].includes(job.status) && <button className={button} disabled={busy || !data.environment.configured} onClick={() => void act({ action: "regenerate", id: job.id }, "Replacement queued; existing approved assignment is retained until review.")}>Regenerate</button>}
              {job.status === "APPROVED" && <button className={button} onClick={() => { setAssetId(job.assetId!); setAssignmentPage(job.target.pageId); setAssignmentSlot(job.slot); setTab("Assignments"); }}>Assign to slot</button>}
              {["APPROVED", "REJECTED", "FAILED"].includes(job.status) && !data.assignments.some(a => a.jobId === job.id) && <button className={button} disabled={busy} onClick={() => void act({ action: "archive", id: job.id }, "Job archived; media and provenance retained.")}>Archive job</button>}
            </div>
          </div></div></WebsiteSeoCard>)}
      </div>}
      {tab === "Assignments" && <WebsiteSeoCard><div className="space-y-4"><h2 className="text-lg font-bold">Assign a reviewed image</h2>
        <label className="block text-sm">Page<select className={field} value={assignmentPage} onChange={e => setAssignmentPage(e.target.value)}>{data.pages.map(p => <option key={p.id} value={p.id}>{p.entity.name} · {p.pathname}</option>)}</select></label>
        <label className="block text-sm">Slot<select className={field} value={assignmentSlot} onChange={e => setAssignmentSlot(e.target.value as ImageSlot)}>{IMAGE_SLOTS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="block text-sm">Media<select className={field} value={assetId} onChange={e => setAssetId(e.target.value)}><option value="">Choose an image</option>{data.media.filter(m => m.status !== "ARCHIVED" && (data.jobs.some(j => j.assetId === m.id) ? data.jobs.some(j => j.assetId === m.id && j.status === "APPROVED") : !m.aiGenerated && m.status === "ACTIVE")).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        <button className={button} disabled={busy || !assetId} onClick={() => void act({ action: "assign", pageId: assignmentPage, slot: assignmentSlot, assetId }, "Image assigned. Published pages now use this slot.")}>Assign image</button>
        <p className="text-sm text-zinc-500">Homepage: heroImage → hero, cardImage → route showcase, sectionImage1 → services, sectionImage2 → corporate, featuredImage → CTA. OG images appear in social previews.</p>
        {data.assignments.filter(a => a.pageId === assignmentPage).map(a => <div key={a.slot} className="flex items-center justify-between gap-3 border-t pt-3"><span className="text-sm">{a.slot} · {a.altText}</span><button className={button} disabled={busy} onClick={() => void act({ action: "assign", pageId: a.pageId, slot: a.slot, assetId: null }, "Assignment removed; existing fallback restored.")}>Remove assignment</button></div>)}
      </div></WebsiteSeoCard>}
      {tab === "Presets" && <div className="space-y-4">{data.presets.map(p => <WebsiteSeoCard key={p.id}><div className="space-y-2"><h2 className="font-bold">{p.name}</h2><p className="text-sm">{p.useCase} · {p.size}</p><p className="text-sm text-zinc-500">{p.tone}. {p.hints}</p><button className={button} onClick={() => setPresetDraft({ ...p })}>Edit preset</button></div></WebsiteSeoCard>)}
        {presetDraft && <WebsiteSeoCard><div className="space-y-3"><h2 className="font-bold">Edit {presetDraft.name}</h2>{(["name", "tone", "hints", "useCase", "negativePrompt"] as const).map(key => <label className="block text-sm" key={key}>{key}<textarea className={field} maxLength={1500} value={presetDraft[key]} onChange={e => setPresetDraft({ ...presetDraft, [key]: e.target.value })} /></label>)}<label className="block text-sm">Default size<select className={field} value={presetDraft.size} onChange={e => setPresetDraft({ ...presetDraft, size: e.target.value as ImagePreset["size"] })}>{["1536x1024", "1024x1024", "1024x1536"].map(s => <option key={s}>{s}</option>)}</select></label><button className={button} disabled={busy} onClick={async () => { const result = await act({ action: "settings", autoGenerate: data.autoGenerate, presets: data.presets.map(p => p.id === presetDraft.id ? presetDraft : p) }, "Preset saved. Existing jobs retain their original preset snapshot."); if (result) setPresetDraft(null); }}>Save preset</button></div></WebsiteSeoCard>}
      </div>}
    </>}
  </main>;
}
