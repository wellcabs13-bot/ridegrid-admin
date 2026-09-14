"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Archive, Copy, ExternalLink, ImagePlus, Loader2, RefreshCw, Save } from "lucide-react";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import { WEBSITE_MEDIA_CATEGORIES, WEBSITE_MEDIA_STATUSES, WEBSITE_MEDIA_IMAGE_TYPES, type WebsiteMedia, type WebsiteMediaLibrary, type WebsiteMediaCategory, type WebsiteMediaStatus } from "@/lib/website-seo/media/types";
import { hasMeaningfulAltText } from "@/lib/website-seo/media/validation";

const fieldClass = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50";
const labelize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
const sizeLabel = (size: number | null) => size === null ? "Size unavailable" : size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  let result: { success?: boolean; data?: T; error?: string };
  try { result = await response.json(); }
  catch { throw new Error("The server returned an invalid response. Please retry."); }
  if (!response.ok || !result.success || result.data === undefined) throw new Error(result.error || "The request failed. Please retry.");
  return result.data;
}

function MediaPreview({ item, large = false }: { item: WebsiteMedia; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`relative overflow-hidden rounded-xl bg-zinc-100 ${large ? "h-64" : "h-40"}`}>
    {item.mimeType?.startsWith("image/") && !failed ?
      <Image src={item.fileUrl} alt={item.altText || ""} fill unoptimized sizes={large ? "480px" : "320px"} className="object-contain" onError={() => setFailed(true)} /> :
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">{failed ? "Preview unavailable. Try opening the file URL." : "No image preview"}</div>}
  </div>;
}

export default function MediaManagerClient() {
  const [library, setLibrary] = useState<WebsiteMediaLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [draft, setDraft] = useState<WebsiteMedia | null>(null);
  const uploadForm = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setLibrary(await requestApi<WebsiteMediaLibrary>("/api/website-seo/media")); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to load media."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => (library?.items ?? []).filter((item) =>
    (!status || item.status === status) && (!category || item.category === category) && (!mimeType || item.mimeType === mimeType) &&
    (!search.trim() || [item.title, item.altText, item.caption, item.originalName || "", item.fileName].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())))
  ), [library, status, category, mimeType, search]);

  function acceptItem(item: WebsiteMedia) {
    setLibrary((current) => {
      if (!current) return current;
      const exists = current.items.some((row) => row.fileAssetId === item.fileAssetId);
      const items = exists ? current.items.map((row) => row.fileAssetId === item.fileAssetId ? item : row) : [item, ...current.items];
      return { ...current, items, summary: { total: items.length, active: items.filter((row) => row.status === "ACTIVE").length, draft: items.filter((row) => row.status === "DRAFT").length, archived: items.filter((row) => row.status === "ARCHIVED").length } };
    });
    setDraft(item);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    setError(""); setNotice("");
    if (!(file instanceof File) || !file.size || !WEBSITE_MEDIA_IMAGE_TYPES.some((type) => type === file.type)) {
      setError("Choose a non-empty JPEG or PNG image."); return;
    }
    if (!String(form.get("title") || "").trim()) form.delete("title");
    setBusy(true);
    try {
      const item = await requestApi<WebsiteMedia>("/api/website-seo/media/upload", { method: "POST", body: form });
      acceptItem(item);
      uploadForm.current?.reset();
      setSearch(""); setStatus(""); setCategory(""); setMimeType("");
      setNotice("Image uploaded as a draft. Add descriptive alt text before activating it.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function save(archive = false) {
    if (!draft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { title, altText, caption, category: nextCategory, status: nextStatus } = draft;
      const item = await requestApi<WebsiteMedia>(`/api/website-seo/media/${encodeURIComponent(draft.fileAssetId)}`, archive ? { method: "DELETE" } : {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, altText, caption, category: nextCategory, status: nextStatus }),
      });
      acceptItem(item);
      setNotice(archive ? "Media archived. The stored file and URL remain available." : "Media metadata saved.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save media."); }
    finally { setBusy(false); }
  }

  const missingAlt = Boolean(draft?.mimeType?.startsWith("image/") && !hasMeaningfulAltText(draft.altText));
  const disabled = loading || busy;
  return <div className="min-h-screen bg-zinc-50 pb-16 text-zinc-950">
    <div className="bg-zinc-950 px-6 py-9 lg:px-8"><div className="mx-auto max-w-7xl">
      <WebsiteSeoSectionHeader eyebrow="Website Manager · Media" title="Website Media Manager" description="Upload, organize and prepare imagery for the RideGrid public website."
        action={<button type="button" disabled={disabled} onClick={() => { setDraft(null); void load(); }} className={`${buttonClass} border border-zinc-700 text-white`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Reload</button>} />
    </div></div>
    <div className="mx-auto max-w-7xl space-y-6 px-6 pt-7 lg:px-8">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {Boolean(library?.missingFileCount) && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{library?.missingFileCount} media metadata reference(s) have no FileAsset. These entries are omitted from the library.</div>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{(["total", "active", "draft", "archived"] as const).map((key) =>
        <WebsiteSeoCard key={key}><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{key === "total" ? "Total website media" : labelize(key)}</p><p className="mt-3 text-3xl font-black">{loading ? "—" : library?.summary[key] ?? "—"}</p></WebsiteSeoCard>
      )}</div>
      <WebsiteSeoCard>
        <h2 className="text-lg font-black">Upload image</h2><p className="mt-1 text-sm text-zinc-500">JPEG and PNG images. New uploads start as drafts.</p>
        <form ref={uploadForm} onSubmit={(event) => void upload(event)} className="mt-4">
          <fieldset disabled={disabled || !library} className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-5 disabled:opacity-60">
            <label className="text-sm font-bold">Choose image<input name="file" type="file" required accept="image/jpeg,image/png,.jpg,.jpeg,.png" className={`${fieldClass} file:mr-2 file:border-0 file:bg-zinc-100 file:text-sm`} /></label>
            <label className="text-sm font-bold">Title (optional)<input name="title" maxLength={500} className={fieldClass} placeholder="Defaults to filename" /></label>
            <label className="text-sm font-bold">Alt text (optional)<input name="altText" maxLength={500} className={fieldClass} placeholder="Describe the image" /></label>
            <label className="text-sm font-bold">Category<select name="category" defaultValue="GENERAL" className={fieldClass}>{WEBSITE_MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <button type="submit" className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}Upload image</button>
          </fieldset>
        </form>
      </WebsiteSeoCard>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <WebsiteSeoCard>
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Media library</h2><span className="text-sm text-zinc-500">{loading ? "Loading…" : `${visible.length} shown`}</span></div>
          <div className="my-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-zinc-500">Search<input value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Title, filename, alt text…" /></label>
            <label className="text-xs font-bold text-zinc-500">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}><option value="">All statuses</option>{WEBSITE_MEDIA_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-xs font-bold text-zinc-500">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="">All categories</option>{WEBSITE_MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-xs font-bold text-zinc-500">File type<select value={mimeType} onChange={(event) => setMimeType(event.target.value)} className={fieldClass}><option value="">All file types</option>{Array.from(new Set([...(library?.items.map((item) => item.mimeType).filter((type): type is string => Boolean(type)) ?? []), ...WEBSITE_MEDIA_IMAGE_TYPES])).map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          {loading ? <p role="status" className="py-12 text-center text-zinc-500">Loading website media…</p> : !library ? <p className="py-12 text-center text-zinc-500">Media could not be loaded. Use Reload to retry.</p> : !visible.length ? <p className="py-12 text-center text-zinc-500">{library.items.length ? "No media matches these filters." : "No website media yet. Upload your first image above."}</p> :
            <div className="grid gap-4 sm:grid-cols-2">{visible.map((item) => <button key={item.fileAssetId} type="button" disabled={disabled} onClick={() => { setDraft({ ...item }); setNotice(""); }} aria-pressed={draft?.fileAssetId === item.fileAssetId} className={`min-w-0 rounded-2xl border p-3 text-left transition disabled:opacity-60 ${draft?.fileAssetId === item.fileAssetId ? "border-red-500 ring-2 ring-red-100" : "border-zinc-200 hover:border-zinc-400"}`}>
              <MediaPreview item={item} />
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span className={`rounded-full px-2 py-1 ${item.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : item.status === "ARCHIVED" ? "bg-zinc-100 text-zinc-500" : "bg-amber-50 text-amber-700"}`}>{item.status}</span><span className="py-1 text-zinc-500">{item.category}</span></div>
              <h3 className="mt-2 truncate font-bold">{item.title || item.originalName || item.fileName}</h3>
              {item.aiGenerated && <span className="text-xs font-bold text-red-600">AI-generated · review in AI Image Engine</span>}
              <p className="mt-1 truncate text-xs text-zinc-500" title={item.originalName || item.fileName}>{item.originalName || item.fileName}</p>
              <p className="mt-2 text-xs text-zinc-500">{item.mimeType || "Unknown type"} · {sizeLabel(item.fileSize)}</p>
              <p className="mt-1 text-xs text-zinc-500">Uploaded {new Date(item.uploadedAt).toLocaleDateString()}</p>
              {item.mimeType?.startsWith("image/") && !hasMeaningfulAltText(item.altText) && <p className="mt-2 text-xs font-bold text-amber-700">Alt text needed</p>}
            </button>)}</div>}
        </WebsiteSeoCard>
        <WebsiteSeoCard className="xl:sticky xl:top-6">
          <h2 className="text-lg font-black">Media details</h2>
          {!draft ? <p className="mt-3 text-sm leading-6 text-zinc-500">Select an image to preview it and edit its website metadata.</p> : <form key={draft.fileAssetId} onSubmit={(event) => { event.preventDefault(); void save(); }} className="mt-4 space-y-4">
            <MediaPreview key={draft.fileAssetId} item={draft} large />
            <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
              <label className="block text-sm font-bold">Title<input value={draft.title} maxLength={500} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={fieldClass} /></label>
              <label className="block text-sm font-bold">Alt text<textarea value={draft.altText} maxLength={500} rows={3} onChange={(event) => setDraft({ ...draft, altText: event.target.value })} className={fieldClass} aria-describedby="media-alt-help" /></label>
              <p id="media-alt-help" className={`text-xs ${missingAlt ? "font-bold text-amber-700" : "text-zinc-500"}`}>{missingAlt ? "Add descriptive alt text before activating this image." : "Describe the image for visitors who cannot see it."}</p>
              <label className="block text-sm font-bold">Caption<textarea value={draft.caption} maxLength={4000} rows={3} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} className={fieldClass} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as WebsiteMediaCategory })} className={fieldClass}>{WEBSITE_MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-bold">Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as WebsiteMediaStatus })} className={fieldClass}>{WEBSITE_MEDIA_STATUSES.map((value) => <option key={value} disabled={value === "ACTIVE" && missingAlt}>{value}</option>)}</select></label>
              </div>
              <label className="block text-sm font-bold">File URL<input readOnly value={draft.fileUrl} className={`${fieldClass} font-normal`} /></label>
              <div className="flex gap-2">
                <a href={draft.fileUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClass} border border-zinc-200`}><ExternalLink size={14} />Open</a>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(new URL(draft.fileUrl, window.location.origin).href); setNotice("File URL copied."); } catch { setError("Could not copy. Select and copy the file URL above."); } }} className={`${buttonClass} border border-zinc-200`}><Copy size={14} />Copy URL</button>
              </div>
              <dl className="space-y-2 break-words text-xs text-zinc-500"><div><dt className="font-bold">Stored filename</dt><dd>{draft.fileName}</dd></div><div><dt className="font-bold">Original filename</dt><dd>{draft.originalName || "Unavailable"}</dd></div><div><dt className="font-bold">File details</dt><dd>{draft.mimeType || "Unknown type"} · {sizeLabel(draft.fileSize)}</dd></div><div><dt className="font-bold">Uploaded</dt><dd>{new Date(draft.uploadedAt).toLocaleString()}</dd></div></dl>
              <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
                <button type="submit" disabled={draft.status === "ACTIVE" && missingAlt} className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}><Save size={15} />{busy ? "Saving…" : "Save metadata"}</button>
                <button type="button" disabled={draft.status === "ARCHIVED"} onClick={() => void save(true)} className={`${buttonClass} border border-zinc-200`}><Archive size={15} />Archive</button>
              </div>
              <p className="text-xs leading-5 text-zinc-500">Archiving updates the media status only. The file and its URL stay available.</p>
            </fieldset>
          </form>}
        </WebsiteSeoCard>
      </div>
    </div>
  </div>;
}
