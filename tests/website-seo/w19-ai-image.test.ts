// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { IMAGE_PRESETS, buildImagePrompt, resolvePreset } from "../../lib/website-seo/media/ai-image/prompt";
import { imageEnvironment } from "../../lib/website-seo/media/ai-image/provider";
import { OpenAIImageProvider } from "../../lib/website-seo/media/ai-image/openai-provider";
import { emptyImageState, IMAGE_ENGINE_KEY, mutateImageState, readImageState } from "../../lib/website-seo/media/ai-image/repository";
import { assignImage, autoQueuePageImages, imageTarget, newImageJob, processNextImage, queueImages, restoreImageJob, reviewImageJob, saveImageSettings } from "../../lib/website-seo/media/ai-image/service";
import { publicImageSlots } from "../../lib/website-seo/media/ai-image/public";
import { IMAGE_SLOTS, PAGE_FAMILIES, type ImageEngineState } from "../../lib/website-seo/media/ai-image/types";
import { validateMediaStore, validateMediaUpdate } from "../../lib/website-seo/media/validation";
import { storeFile } from "../../lib/services/storage/FileStorageService";
import { websiteMediaRepository } from "../../lib/website-seo/media/repository";

vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn(), systemSetting: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), delete: vi.fn() }, websiteSeoPage: { findUnique: vi.fn() }, fileAsset: { findFirst: vi.fn(), findMany: vi.fn() } } }));
vi.mock("../../lib/services/storage/FileStorageService", () => ({ storeFile: vi.fn() }));
vi.mock("../../lib/website-seo/media/repository", () => ({ websiteMediaRepository: { create: vi.fn() } }));
let state: ImageEngineState;
let mediaStatus = "DRAFT";
const homepage = { pageId: "homepage", family: "HOMEPAGE" as const, title: "RideGrid journeys", pathname: "/", context: "Airport and business travel", keywords: ["cab travel"] };
const file = { id: "asset-1", entityType: "WEBSITE_MEDIA", mimeType: "image/png", fileUrl: "/api/files/asset-1" };
beforeEach(() => {
  vi.restoreAllMocks(); vi.clearAllMocks(); vi.stubEnv("AI_IMAGE_PROVIDER", "openai"); vi.stubEnv("OPENAI_API_KEY", "test-key-never-sent");
  vi.stubEnv("AI_IMAGE_MODEL", "gpt-image-1"); vi.stubEnv("AI_IMAGE_DEFAULT_SIZE", "1536x1024"); vi.stubEnv("AI_IMAGE_DEFAULT_QUALITY", "high");
  state = emptyImageState(); mediaStatus = "DRAFT";
  vi.mocked(prisma.$transaction).mockImplementation(async (work: any) => work(prisma));
  vi.mocked(prisma.systemSetting.findUnique).mockImplementation(async (args: any) => ({ settingValue: args.where.settingKey === IMAGE_ENGINE_KEY ? JSON.stringify(state) : JSON.stringify({ version: 1, items: [{ fileAssetId: "asset-1", status: mediaStatus, caption: "[AI-generated]", altText: "Road journey" }] }) }) as never);
  vi.mocked(prisma.systemSetting.upsert).mockImplementation(async (args: any) => { state = JSON.parse(args.update.settingValue); return {} as never; });
  vi.mocked(prisma.fileAsset.findFirst).mockResolvedValue(file as never);
  vi.mocked(prisma.fileAsset.findMany).mockResolvedValue([file] as never);
  vi.mocked(prisma.websiteSeoPage.findUnique).mockResolvedValue({ id: "page-1", pathname: "/cities/pune", status: "DRAFT", entity: { name: "Pune", type: "CITY", metadata: { city: "Pune", apiKey: "DO-NOT-SEND" }, keywords: [{ keyword: "Pune cab" }] } } as never);
  vi.mocked(storeFile).mockResolvedValue({ id: "asset-1", fileUrl: file.fileUrl } as never);
  vi.mocked(websiteMediaRepository.create).mockResolvedValue({ fileAssetId: "asset-1" } as never);
});
describe("W19 prompt builder and provider", () => {
  it.each(PAGE_FAMILIES)("builds relevant branded prompts for %s", family => {
    const prompt = buildImagePrompt({ ...homepage, family }, "heroImage", resolvePreset(undefined, [], family));
    expect(prompt).toContain(family); expect(prompt).toContain("RideGrid"); expect(prompt).toContain("red accents"); expect(prompt).toContain("space on the left"); expect(prompt).toContain("cab travel");
  });
  it.each(IMAGE_SLOTS)("supports slot %s", slot => expect(buildImagePrompt(homepage, slot, IMAGE_PRESETS[0])).toContain(slot));
  it("resolves family presets, overrides and rejects unknown presets", () => {
    expect(resolvePreset(undefined, [], "AIRPORT").id).toBe("airport-transfer");
    expect(resolvePreset("premium-corporate", [{ ...IMAGE_PRESETS[0], tone: "Custom" }]).tone).toBe("Custom");
    expect(() => resolvePreset("missing")).toThrow();
  });
  it("fails gracefully with absent or invalid configuration without exposing secrets", () => {
    expect(imageEnvironment({}).error).toContain("OPENAI_API_KEY");
    expect(imageEnvironment({ OPENAI_API_KEY: "secret", AI_IMAGE_PROVIDER: "unknown" }).error).toContain("AI_IMAGE_PROVIDER");
    expect(imageEnvironment({ OPENAI_API_KEY: "secret", AI_IMAGE_DEFAULT_SIZE: "large" }).configured).toBe(false);
    expect(imageEnvironment({ OPENAI_API_KEY: "secret", AI_IMAGE_DEFAULT_QUALITY: "best" }).configured).toBe(false);
    expect(JSON.stringify(imageEnvironment({ OPENAI_API_KEY: "secret" }))).not.toContain("secret");
  });
  it.each([400, 401, 403, 429, 500])("sanitizes provider HTTP %s failures", async status => {
    const provider = new OpenAIImageProvider("secret", vi.fn().mockResolvedValue(new Response("secret-provider-error", { status })));
    await expect(provider.generate({ prompt: "Travel", model: "gpt-image-1", size: "1536x1024", quality: "high" })).rejects.not.toThrow("secret-provider-error");
  });
  it("uses one PNG output and the exact configured model without URL downloads", async () => {
    const png = Buffer.alloc(33); Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.write("IHDR", 12); png.writeUInt32BE(1536,16); png.writeUInt32BE(1024,20);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [{ b64_json: png.toString("base64") }] }));
    const result = await new OpenAIImageProvider("secret", fetcher).generate({ prompt: "Travel", model: "gpt-image-1", size: "1536x1024", quality: "high" });
    expect(result.width).toBe(1536); expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ n: 1, model: "gpt-image-1", output_format: "png", quality: "high" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([{ data: [] }, { data: [{ url: "https://untrusted.test/image" }] }, { data: [{ b64_json: "garbage" }] }])("rejects invalid image output", async payload => {
    await expect(new OpenAIImageProvider("key", vi.fn().mockResolvedValue(Response.json(payload))).generate({ prompt: "Travel", model: "gpt-image-1", size: "1536x1024", quality: "high" })).rejects.toThrow();
  });
});
describe("W19 durable generation and assignments", () => {
  it("queues idempotently and captures provenance", async () => {
    expect(await queueImages(["homepage"], ["heroImage", "ogImage"], "admin")).toHaveLength(2);
    expect(await queueImages(["homepage"], ["heroImage"], "admin")).toHaveLength(0);
    expect(state.jobs[0]).toMatchObject({ createdBy: "admin", status: "QUEUED", provider: "openai", model: "gpt-image-1", altText: expect.any(String), preset: { id: "premium-corporate" } });
  });
  it("rejects oversized batches before writes", async () => { await expect(queueImages(Array(26).fill("homepage"), ["heroImage"], "admin")).rejects.toThrow(); expect(prisma.systemSetting.upsert).not.toHaveBeenCalled(); });
  it("rejects nonexistent page targets and excludes private context", async () => {
    expect(JSON.stringify(await imageTarget("page-1"))).not.toContain("DO-NOT-SEND");
    vi.mocked(prisma.websiteSeoPage.findUnique).mockResolvedValue(null);
    await expect(queueImages(["missing"], ["heroImage"], "admin")).rejects.toThrow();
  });
  it("retries serializable conflicts without provider calls", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "6" }));
    await mutateImageState("admin", s => { s.autoGenerate = true; }); expect(state.autoGenerate).toBe(true); expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it("does not overwrite malformed persisted state", async () => {
    vi.mocked(prisma.systemSetting.findUnique).mockResolvedValue({ settingValue: "{}" } as never);
    await expect(readImageState()).rejects.toThrow(); expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
  it("generates into the existing library, then requires approval before public rendering", async () => {
    await queueImages(["homepage"], ["heroImage"], "admin");
    const provider = { generate: vi.fn().mockResolvedValue({ content: Buffer.from("test-only"), width: 1536, height: 1024, mimeType: "image/png" }) };
    const job = await processNextImage(provider); expect(job?.status).toBe("GENERATED"); expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(websiteMediaRepository.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ caption: expect.stringContaining("[AI-generated]"), altText: expect.any(String) }), job!.id);
    expect(await publicImageSlots("homepage")).toEqual({});
    await expect(assignImage("homepage", "heroImage", "asset-1", "admin")).rejects.toThrow("Approve");
    await reviewImageJob(job!.id, "approve", "editor");
    expect((await publicImageSlots("homepage")).heroImage?.src).toBe(file.fileUrl);
    expect(await publicImageSlots("other-page")).toEqual({});
    await reviewImageJob(job!.id, "reject", "editor"); expect(await publicImageSlots("homepage")).toEqual({});
  });
  it("enforces claim ownership and does not generate when another worker is active", async () => {
    const job = newImageJob(homepage, "heroImage", state, "admin"); job.status = "PROCESSING"; job.claim = "other-worker"; state.jobs.push(job);
    const provider = { generate: vi.fn() }; expect(await processNextImage(provider)).toBeNull(); expect(provider.generate).not.toHaveBeenCalled();
  });
  it("fails interrupted jobs without automatically paying for another request", async () => {
    const job = newImageJob(homepage, "heroImage", state, "admin"); job.status = "PROCESSING"; job.updatedAt = "2000-01-01T00:00:00Z"; state.jobs.push(job);
    const provider = { generate: vi.fn() }; await processNextImage(provider); expect(state.jobs[0].status).toBe("FAILED"); expect(provider.generate).not.toHaveBeenCalled();
  });
  it("retains failed job state when provider or storage fails", async () => {
    await queueImages(["homepage"], ["heroImage"], "admin");
    const job = await processNextImage({ generate: vi.fn().mockRejectedValue(new Error("sensitive upstream text")) });
    expect(job?.status).toBe("FAILED"); expect(job?.error).not.toContain("sensitive"); expect(state.assignments).toHaveLength(0);
  });
  it("regenerates while retaining the currently approved assignment", async () => {
    const job = newImageJob(homepage, "heroImage", state, "admin"); job.status = "GENERATED"; job.assetId = "asset-1"; state.jobs.push(job);
    await reviewImageJob(job.id, "approve", "admin"); const original = state.assignments[0];
    await reviewImageJob(job.id, "regenerate", "admin"); expect(state.jobs).toHaveLength(2); expect(state.assignments[0]).toEqual(original);
    await expect(reviewImageJob(job.id, "regenerate", "admin")).rejects.toThrow("pending");
  });
  it("removes assignments, rejects missing files, and hides archived media", async () => {
    const job = newImageJob(homepage, "heroImage", state, "admin"); job.status = "GENERATED"; job.assetId = "asset-1"; state.jobs.push(job);
    await reviewImageJob(job.id, "approve", "admin"); mediaStatus = "ARCHIVED"; expect(await publicImageSlots("homepage")).toEqual({});
    mediaStatus = "DRAFT"; vi.mocked(prisma.fileAsset.findMany).mockResolvedValue([]); expect(await publicImageSlots("homepage")).toEqual({});
    await assignImage("homepage", "heroImage", null, "admin"); expect(state.assignments).toHaveLength(0);
    vi.mocked(prisma.fileAsset.findFirst).mockResolvedValue(null); await expect(assignImage("homepage", "heroImage", "missing", "admin")).rejects.toThrow();
  });
  it("returns empty public slots on DB failures and corrupt records", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB unavailable")); expect(await publicImageSlots("homepage")).toEqual({});
  });
  it("keeps page creation independent of unavailable generation", async () => {
    state.autoGenerate = true; vi.stubEnv("OPENAI_API_KEY", ""); const result = await autoQueuePageImages("page-1"); expect(result.queued).toBe(0); expect(result.error).toContain("OPENAI_API_KEY");
    expect(await autoQueuePageImages("page-1", false)).toEqual({ queued: 0, error: null });
  });
  it("validates persisted presets and snapshots them into future jobs", async () => {
    await expect(saveImageSettings(true, [{ ...IMAGE_PRESETS[0], size: "bad" } as never], "admin")).rejects.toThrow();
    await saveImageSettings(true, [{ ...IMAGE_PRESETS[0], tone: "New tone" }], "admin");
    await queueImages(["homepage"], ["heroImage"], "admin"); expect(state.jobs[0].preset.tone).toBe("New tone");
  });
  it("archives unassigned jobs without deleting media, and restores them for reuse", async () => {
    const job = newImageJob(homepage, "heroImage", state, "admin"); job.status = "APPROVED"; job.assetId = "asset-1"; state.jobs.push(job);
    await reviewImageJob(job.id, "archive", "editor"); expect(state.jobs).toHaveLength(0);
    const originalRead = vi.mocked(prisma.systemSetting.findUnique).getMockImplementation()!;
    vi.mocked(prisma.systemSetting.findUnique).mockImplementation(async (args: any) => args.where.settingKey === `website-seo.ai-image-history.${job.id}` ? { settingValue: JSON.stringify(job) } as never : originalRead(args));
    await restoreImageJob(job.id, "editor"); expect(state.jobs[0].status).toBe("APPROVED");
    await assignImage("homepage", "cardImage", "asset-1", "editor"); expect(state.assignments[0].slot).toBe("cardImage");
    await expect(reviewImageJob(job.id, "archive", "editor")).rejects.toThrow("without assignments");
  });
  it("preserves immutable AI provenance across metadata edits", () => {
    const item = { fileAssetId: "asset-1", title: "Edited title", altText: "Travel image", caption: "Edited caption", category: "HERO", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), aiGenerated: true, aiJobId: "job-1" };
    expect(validateMediaStore({ version: 1, items: [item] })[0].aiGenerated).toBe(true);
    expect(() => validateMediaUpdate({ aiGenerated: false })).toThrow();
  });
});
