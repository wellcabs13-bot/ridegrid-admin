import { NextRequest } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { websiteSeoApiError, websiteSeoApiSuccess } from "@/lib/website-seo/api";
import { websiteMediaRepository } from "@/lib/website-seo/media/repository";
import { IMAGE_PRESETS, buildImagePrompt, imageSlot, resolvePreset } from "@/lib/website-seo/media/ai-image/prompt";
import { imageEnvironment } from "@/lib/website-seo/media/ai-image/provider";
import { readImageState } from "@/lib/website-seo/media/ai-image/repository";
import { assignImage, imageTarget, queueImages, restoreImageJob, reviewImageJob, saveImageSettings } from "@/lib/website-seo/media/ai-image/service";
import { ImageEngineError, type ImagePreset } from "@/lib/website-seo/media/ai-image/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function actor(request: NextRequest) { return authorize(request.cookies.get("ridegrid_access_token")?.value, ["SUPER_ADMIN"]); }
export async function GET(request: NextRequest) {
  if (!actor(request)) return websiteSeoApiError("Administrator access required.", 403);
  try {
    const [state, pages, media, history] = await Promise.all([
      readImageState(), prisma.websiteSeoPage.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, pathname: true, entity: { select: { name: true, type: true } } }, orderBy: { updatedAt: "desc" }, take: 500 }),
      websiteMediaRepository.list({ mimeType: "image" }),
      prisma.systemSetting.findMany({ where: { settingKey: { startsWith: "website-seo.ai-image-history." } }, select: { settingValue: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    ]);
    return websiteSeoApiSuccess({ ...state, environment: imageEnvironment(), presets: IMAGE_PRESETS.map(p => state.presets.find(o => o.id === p.id) ?? p).concat(state.presets.filter(p => !IMAGE_PRESETS.some(b => b.id === p.id))),
      pages: [{ id: "homepage", pathname: "/", entity: { name: "Homepage", type: "HOMEPAGE" } }, ...pages],
      archivedJobs: history.map(row => { const job = JSON.parse(row.settingValue); return { id: job.id, title: job.target?.title, slot: job.slot, status: job.status }; }),
      media: media.items.map(m => ({ id: m.fileAssetId, title: m.title, url: m.fileUrl, status: m.status, altText: m.altText, aiGenerated: m.aiGenerated ?? false })) });
  } catch { return websiteSeoApiError("Unable to load AI Image Engine. Check database availability."); }
}
export async function POST(request: NextRequest) {
  const user = actor(request); if (!user) return websiteSeoApiError("Administrator access required.", 403);
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") return websiteSeoApiError("Cross-site image changes are not allowed.", 403);
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new ImageEngineError("Expected an image action.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 64_000) { await reader.cancel(); return websiteSeoApiError("Request is too large.", 413); }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const body = JSON.parse(text) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ImageEngineError("Expected an image action.");
    const string = (key: string, optional = false) => {
      const value = body[key]; if (optional && value === undefined) return undefined;
      if (typeof value !== "string" || !value.trim()) throw new ImageEngineError(`${key} must be non-empty text.`); return value.trim();
    };
    if (body.action === "queue") {
      if (!Array.isArray(body.pageIds) || body.pageIds.some(id => typeof id !== "string" || !id || id.length > 200) || !Array.isArray(body.slots)) throw new ImageEngineError("Choose pages and image slots.");
      if (body.autoAssign !== undefined && typeof body.autoAssign !== "boolean") throw new ImageEngineError("autoAssign must be true or false.");
      return websiteSeoApiSuccess(await queueImages(body.pageIds as string[], body.slots.map(imageSlot), user.id, { presetId: string("presetId", true), prompt: string("prompt", true), altText: string("altText", true), autoAssign: body.autoAssign as boolean | undefined }));
    }
    if (body.action === "preview") {
      const state = await readImageState(), target = await imageTarget(string("pageId")!);
      const preset = resolvePreset(string("presetId", true), state.presets, target.family);
      return websiteSeoApiSuccess({ prompt: buildImagePrompt(target, imageSlot(body.slot), preset), preset });
    }
    if (["approve", "reject", "regenerate", "archive"].includes(String(body.action))) return websiteSeoApiSuccess(await reviewImageJob(string("id")!, body.action as "approve" | "reject" | "regenerate" | "archive", user.id));
    if (body.action === "restore") return websiteSeoApiSuccess(await restoreImageJob(string("id")!, user.id));
    if (body.action === "assign") return websiteSeoApiSuccess(await assignImage(string("pageId")!, imageSlot(body.slot), body.assetId === null ? null : string("assetId")!, user.id, string("altText", true)));
    if (body.action === "settings") { await saveImageSettings(body.autoGenerate as boolean, body.presets as ImagePreset[], user.id); return websiteSeoApiSuccess({ saved: true }); }
    return websiteSeoApiError("Unknown image action.", 400);
  } catch (error) {
    if (error instanceof ImageEngineError || error instanceof SyntaxError) return websiteSeoApiError(error.message, 400);
    return websiteSeoApiError("Image operation failed. Check database availability and retry.");
  }
}
