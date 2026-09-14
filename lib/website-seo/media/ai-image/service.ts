import { randomUUID } from "node:crypto";
import { imageCostQuality, ImageRateLimitError, retryDelay } from "./policy";
import { prisma } from "@/lib/prisma";
import { storeFile } from "@/lib/services/storage/FileStorageService";
import { websiteMediaRepository } from "../repository";
import { buildImagePrompt, imageSlot, resolvePreset } from "./prompt";
import { imageEnvironment, imageProvider, type ImageProvider } from "./provider";
import { mutateImageState, readImageState } from "./repository";
import { ImageEngineError, PAGE_FAMILIES, type ImageAssignment, type ImageEngineState, type ImageJob, type ImagePreset, type ImageSlot, type ImageTarget } from "./types";

export async function imageTarget(pageId: string): Promise<ImageTarget> {
  if (pageId === "homepage") return { pageId, family: "HOMEPAGE", title: "RideGrid by Wellcabs ground mobility", pathname: "/", context: "Outstation journeys, airport transfers, local cabs and corporate mobility", keywords: [] };
  const page = await prisma.websiteSeoPage.findUnique({ where: { id: pageId }, include: { entity: { include: { keywords: { where: { status: "APPROVED" }, take: 10 } } } } });
  if (!page || page.status === "ARCHIVED" || !PAGE_FAMILIES.some(f => f === page.entity.type)) throw new ImageEngineError("Choose an existing, non-archived website page.");
  const metadata = page.entity.metadata as Record<string, unknown> | null;
  // Only editorial location/service fields are sent to the external provider.
  const context = ["intent", "fromCity", "toCity", "city", "airport", "service", "vehicle", "area"].flatMap(key => typeof metadata?.[key] === "string" ? [`${key}: ${String(metadata[key]).slice(0, 200)}`] : []).join("; ");
  return { pageId, family: page.entity.type, title: page.entity.name.slice(0, 300), pathname: page.pathname, context, keywords: page.entity.keywords.map(k => k.keyword.slice(0, 100)), majorCommercial: metadata?.majorCommercial === true };
}
export function newImageJob(target: ImageTarget, slot: ImageSlot, state: ImageEngineState, actor: string, options: { presetId?: string; prompt?: string; altText?: string; autoAssign?: boolean } = {}): ImageJob {
  const config = imageEnvironment();
  const preset = resolvePreset(options.presetId, state.presets, target.family);
  const prompt = options.prompt?.trim() || buildImagePrompt(target, slot, preset);
  const altText = options.altText?.trim() || `${target.title} — ${slot === "heroImage" ? "journey overview" : "travel illustration"}`;
  if (prompt.length > 8000 || altText.length > 500 || !altText) throw new ImageEngineError("Prompt must be at most 8000 characters and alt text 1–500 characters.");
  const now = new Date().toISOString();
  return { id: randomUUID(), target, slot, prompt, negativePrompt: preset.negativePrompt, preset, status: "QUEUED", provider: config.provider, model: config.model,
    size: process.env.AI_IMAGE_DEFAULT_SIZE ? config.size : preset.size, quality: imageCostQuality(target, slot), altText,
    filename: `${target.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "ridegrid"}-${slot}.png`,
    autoAssign: options.autoAssign ?? true, assetId: null, width: null, height: null, mimeType: null, error: null, claim: null,
    createdAt: now, updatedAt: now, createdBy: actor, updatedBy: actor };
}
export async function queueImages(pageIds: string[], slots: ImageSlot[], actor: string, options: { presetId?: string; prompt?: string; altText?: string; autoAssign?: boolean } = {}) {
  if (!pageIds.length || pageIds.length > 25 || !slots.length || slots.length > 8 || pageIds.length * slots.length > 100) throw new ImageEngineError("Choose up to 25 pages and 100 images per batch.");
  slots.forEach(imageSlot);
  const config = imageEnvironment(); if (config.error) throw new ImageEngineError(config.error);
  const targets: ImageTarget[] = [];
  for (const pageId of new Set(pageIds)) targets.push(await imageTarget(pageId));
  return mutateImageState(actor, state => {
    if (state.jobs.length + targets.length * slots.length > 2000) throw new ImageEngineError("Image job capacity reached. Archive reviewed, unassigned jobs before queueing more.");
    const jobs: ImageJob[] = [];
    for (const target of targets) for (const slot of new Set(slots)) {
      // Idempotent repeated creation and page-factory retries. Explicit regenerate
      // is separate and preserves the prior approved image until reviewed.
      if (state.jobs.some(j => j.target.pageId === target.pageId && j.slot === slot && !["FAILED", "REJECTED"].includes(j.status))) continue;
      const job = newImageJob(target, slot, state, actor, options); state.jobs.push(job); jobs.push(job);
    }
    return jobs;
  });
}
export function assertReviewable(job: ImageJob) {
  if (!["GENERATED", "APPROVED"].includes(job.status) || !job.assetId) throw new ImageEngineError("Only successfully generated images can be approved or assigned.");
}
function setAssignment(state: ImageEngineState, input: Omit<ImageAssignment, "updatedAt">) {
  state.assignments = state.assignments.filter(a => a.pageId !== input.pageId || a.slot !== input.slot);
  state.assignments.push({ ...input, updatedAt: new Date().toISOString() });
}
export async function reviewImageJob(id: string, action: "approve" | "reject" | "regenerate" | "archive", actor: string) {
  return mutateImageState(actor, async (state, tx) => {
    const job = state.jobs.find(j => j.id === id);
    if (!job) throw new ImageEngineError("Image job not found.");
    if (action === "archive") {
      if (!["APPROVED", "REJECTED", "FAILED"].includes(job.status) || state.assignments.some(a => a.jobId === id)) throw new ImageEngineError("Only reviewed or failed jobs without assignments can be archived.");
      const { ConfigurationScope, SystemSettingType } = await import("@prisma/client");
      await tx.systemSetting.create({ data: { settingKey: `website-seo.ai-image-history.${id}`, settingValue: JSON.stringify(job), settingType: SystemSettingType.JSON, scope: ConfigurationScope.GLOBAL, description: "Archived AI image provenance." } });
      state.jobs = state.jobs.filter(j => j.id !== id); return job;
    }
    if (action === "regenerate") {
      if (["PROCESSING", "QUEUED"].includes(job.status)) throw new ImageEngineError("Wait for the current generation to finish.");
      if (state.jobs.some(j => j.target.pageId === job.target.pageId && j.slot === job.slot && ["QUEUED", "PROCESSING"].includes(j.status))) throw new ImageEngineError("This slot already has a pending generation.");
      if (state.jobs.length >= 2000) throw new ImageEngineError("Archive older jobs first.");
      const config = imageEnvironment(); if (config.error) throw new ImageEngineError(config.error);
      const replacement = newImageJob(job.target, job.slot, state, actor, { presetId: job.preset.id, prompt: job.prompt, altText: job.altText, autoAssign: job.autoAssign });
      state.jobs.push(replacement); return replacement;
    }
    if (action === "reject") {
      if (!["GENERATED", "APPROVED", "QUEUED", "DRAFT"].includes(job.status)) throw new ImageEngineError("This job cannot be rejected in its current state.");
      job.status = "REJECTED"; state.assignments = state.assignments.filter(a => a.jobId !== id);
    } else {
      assertReviewable(job);
      const file = await tx.fileAsset.findFirst({ where: { id: job.assetId!, entityType: "WEBSITE_MEDIA", mimeType: "image/png" } });
      if (!file) throw new ImageEngineError("Generated media file is missing.");
      job.status = "APPROVED";
      if (job.autoAssign) setAssignment(state, { pageId: job.target.pageId, slot: job.slot, assetId: job.assetId!, altText: job.altText, jobId: job.id, updatedBy: actor });
    }
    job.updatedAt = new Date().toISOString(); job.updatedBy = actor;
    return job;
  });
}
export async function restoreImageJob(id: string, actor: string) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new ImageEngineError("Invalid archived job id.");
  return mutateImageState(actor, async (state, tx) => {
    if (state.jobs.some(j => j.id === id)) throw new ImageEngineError("Job is already in the active queue.");
    if (state.jobs.length >= 2000) throw new ImageEngineError("Archive older jobs before restoring this one.");
    const settingKey = `website-seo.ai-image-history.${id}`;
    const history = await tx.systemSetting.findUnique({ where: { settingKey } });
    if (!history) throw new ImageEngineError("Archived job not found.");
    const job = JSON.parse(history.settingValue) as ImageJob;
    if (job.id !== id || !["APPROVED", "REJECTED", "FAILED"].includes(job.status) || !job.target?.pageId) throw new ImageEngineError("Archived job is invalid.");
    job.updatedAt = new Date().toISOString(); job.updatedBy = actor;
    state.jobs.push(job); await tx.systemSetting.delete({ where: { settingKey } }); return job;
  });
}
export async function assignImage(pageId: string, slot: ImageSlot, assetId: string | null, actor: string, altText?: string) {
  if (assetId) await imageTarget(pageId);
  imageSlot(slot);
  return mutateImageState(actor, async (state, tx) => {
    if (!assetId) { state.assignments = state.assignments.filter(a => a.pageId !== pageId || a.slot !== slot); return null; }
    const file = await tx.fileAsset.findFirst({ where: { id: assetId, entityType: "WEBSITE_MEDIA", mimeType: { in: ["image/png", "image/jpeg"] } } });
    if (!file) throw new ImageEngineError("Choose a website image from the media library.");
    const job = state.jobs.find(j => j.assetId === assetId);
    if (job && job.status !== "APPROVED") throw new ImageEngineError("Approve this generated image before assigning it.");
    // Generated assets remain DRAFT in the generic library; their review state is
    // authoritative here so they never become unrelated global hero fallbacks.
    const metadata = await tx.systemSetting.findUnique({ where: { settingKey: "website-seo.media-metadata" } });
    const items = metadata ? JSON.parse(metadata.settingValue).items : [];
    const media = items.find((m: { fileAssetId: string }) => m.fileAssetId === assetId);
    if (!media || media.status === "ARCHIVED") throw new ImageEngineError("Archived or missing media cannot be assigned.");
    if (!job && (media?.status !== "ACTIVE" || media?.aiGenerated || media?.caption?.startsWith("[AI-generated]"))) throw new ImageEngineError("Choose an ACTIVE uploaded image or an approved generated image. Restore archived generated jobs before reuse.");
    const alt = altText?.trim() || job?.altText || media?.altText;
    if (!alt || alt.length > 500) throw new ImageEngineError("Add descriptive alt text of at most 500 characters.");
    setAssignment(state, { pageId, slot, assetId, altText: alt, jobId: job?.id ?? null, updatedBy: actor });
    return state.assignments.find(a => a.pageId === pageId && a.slot === slot);
  });
}
export async function saveImageSettings(autoGenerate: boolean, presets: ImagePreset[], actor: string) {
  if (typeof autoGenerate !== "boolean" || !Array.isArray(presets) || presets.length > 20) throw new ImageEngineError("Invalid image settings.");
  const ids = new Set<string>();
  for (const p of presets) {
    if (!p || !/^[a-z0-9-]{1,60}$/.test(p.id) || ids.has(p.id) || !["1536x1024", "1024x1024", "1024x1536"].includes(p.size) ||
      [p.name, p.tone, p.hints, p.useCase, p.negativePrompt].some(v => typeof v !== "string" || !v.trim() || v.length > 1500)) throw new ImageEngineError("Preset fields must be non-empty text, up to 1500 characters, with a unique slug and supported size.");
    ids.add(p.id);
  }
  return mutateImageState(actor, state => { state.autoGenerate = autoGenerate; state.presets = presets; });
}
export async function autoQueuePageImages(pageId: string, enabled?: boolean) {
  try {
    const state = await readImageState();
    if (!(enabled ?? state.autoGenerate)) return { queued: 0, error: null };
    const jobs = await queueImages([pageId], ["heroImage", "ogImage"], "page-factory");
    return { queued: jobs.length, error: null };
  } catch (error) {
    // A provider/queue failure cannot undo a successfully created page.
    return { queued: 0, error: error instanceof ImageEngineError ? error.message : "Page saved, but image automation is unavailable. Queue images from AI Image Engine." };
  }
}

export async function processNextImage(provider?: ImageProvider): Promise<ImageJob | null> {
  const implementation = provider ?? imageProvider();
  const pending = await readImageState();
  if (!pending.jobs.some(j => (j.status === "QUEUED" && (!j.notBefore || Date.parse(j.notBefore) <= Date.now())) || (j.status === "PROCESSING" && Date.now() - Date.parse(j.updatedAt) > 10 * 60_000))) return null;
  const claim = randomUUID();
  const job = await mutateImageState("image-worker", state => {
    for (const j of state.jobs) if (j.status === "PROCESSING" && Date.now() - Date.parse(j.updatedAt) > 10 * 60_000) {
      j.status = "FAILED"; j.claim = null; j.error = "Worker interrupted. Check provider usage before regenerating; the request may have been billed."; j.updatedAt = new Date().toISOString();
    }
    if (state.jobs.some(j => j.status === "PROCESSING")) return null; // Global spend/concurrency bound.
    const next = state.jobs.find(j => j.status === "QUEUED" && (!j.notBefore || Date.parse(j.notBefore) <= Date.now())); if (!next) return null;
    next.attempts = (next.attempts || 0) + 1; next.notBefore = null;
    next.status = "PROCESSING"; next.claim = claim; next.updatedAt = new Date().toISOString(); next.updatedBy = "image-worker";
    return { ...next };
  });
  if (!job) return null;
  try {
    if (job.provider !== "openai") throw new ImageEngineError("Queued provider is unsupported. Correct settings and regenerate.");
    await imageTarget(job.target.pageId); // Page may have been deleted after queueing.
    const result = await implementation.generate({ prompt: `${job.prompt}\nAvoid: ${job.negativePrompt}`, model: job.model, size: job.size, quality: job.quality });
    const stored = await storeFile({ name: job.filename, mimeType: result.mimeType, content: result.content });
    const media = await websiteMediaRepository.create(stored, { title: `AI-generated · ${job.target.title} · ${job.slot}`, altText: job.altText, caption: `[AI-generated] Job ${job.id}; ${job.provider}/${job.model}; review in AI Image Engine.`, category: job.target.family === "HOMEPAGE" ? "HERO" : job.target.family }, job.id);
    return await mutateImageState("image-worker", state => {
      const current = state.jobs.find(j => j.id === job.id);
      if (!current || current.status !== "PROCESSING" || current.claim !== claim) throw new ImageEngineError("Worker lease expired. Output remains in Media Library for inspection.");
      Object.assign(current, { status: "GENERATED", assetId: media.fileAssetId, width: result.width, height: result.height, mimeType: result.mimeType, error: null, claim: null, updatedAt: new Date().toISOString() });
      return current;
    });
  } catch (error) {
    return mutateImageState("image-worker", state => {
      const current = state.jobs.find(j => j.id === job.id);
      if (!current) throw error;
      if (current.claim === claim && error instanceof ImageRateLimitError && (current.attempts || 0) < 3) {
        Object.assign(current, { status: "QUEUED", claim: null, error: error.message, notBefore: new Date(Date.now() + retryDelay(current.attempts || 1, error.retryAfterMs)).toISOString(), updatedAt: new Date().toISOString() });
        return current;
      }
      if (current.claim === claim) Object.assign(current, { status: "FAILED", claim: null, error: error instanceof ImageRateLimitError ? "Rate limit retry limit reached. Retry later from AI Images." : error instanceof ImageEngineError ? error.message : "Generation or storage failed. Inspect Media Library and provider usage before retrying.", updatedAt: new Date().toISOString() });
      return current;
    });
  }
}
