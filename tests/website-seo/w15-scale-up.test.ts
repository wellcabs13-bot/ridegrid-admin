import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  websiteSeoTemplate: { findMany: vi.fn() },
  websiteSeoEntity: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  websiteSeoPage: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  websiteSeoKeyword: { findFirst: vi.fn(), create: vi.fn() },
  websiteSeoScaleItem: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  websiteSeoScaleRun: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  $transaction: vi.fn(),
}));
const engines = vi.hoisted(() => ({ entity: vi.fn(), page: vi.fn(), keywords: vi.fn(), content: vi.fn(), seo: vi.fn(), readiness: vi.fn(), publish: vi.fn(), automation: vi.fn(), ai: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/website-seo/entities/repository", () => ({ websiteEntityRepository: { create: engines.entity } }));
vi.mock("@/lib/website-seo/pages/generation-service", () => ({ websitePageGenerationService: { generateAndPersist: engines.page } }));
vi.mock("@/lib/website-seo/keywords/engine", () => ({ keywordIntelligenceEngine: { generate: engines.keywords } }));
vi.mock("@/lib/website-seo/content/engine", () => ({ websiteContentEngine: { generate: engines.content } }));
vi.mock("@/lib/website-seo/seo/engine", () => ({ websiteSeoEngine: { generate: engines.seo } }));
vi.mock("@/lib/website-seo/publishing/engine", () => ({ publishingIndexingEngine: { preview: engines.readiness, publish: engines.publish } }));
vi.mock("@/lib/website-seo/automation/repository", () => ({ websiteAutomationRepository: { load: engines.automation } }));
vi.mock("@/lib/website-seo/ai-control/repository", () => ({ websiteSeoAiControlRepository: { load: engines.ai } }));
import { candidateInput, candidateKey, classify, duplicateKeys, HARD_LIMIT, parseImport, planInput, progress, transition } from "@/lib/website-seo/scale/logic";
import { dryRun } from "@/lib/website-seo/scale/candidates";
import { isolated, runPipeline, type ScalePipeline } from "@/lib/website-seo/scale/pipeline";
import { WEBSITE_ENTITY_TYPES } from "@/lib/website-seo/entities/types";
import { analyzeKeywords } from "@/lib/website-seo/keywords/engine/analyze";
import { executeRun, importCandidates, controlRun } from "@/lib/website-seo/scale/service";

const input = { type: "CITY", name: "Verified City", slug: "verified-city", metadata: { city: "Verified City" } };
const plan = { name: "Pilot", entityType: "CITY", rolloutLevel: "PILOT_10", batchSize: 10 };
function pipeline(order: string[] = []): ScalePipeline {
  return {
    entity: async () => { order.push("entity"); return "entity"; },
    page: async () => { order.push("page"); return "page"; },
    keywords: async () => { order.push("keywords"); return true; },
    content: async () => { order.push("content"); return true; },
    seo: async () => { order.push("seo"); return true; },
    readiness: async () => { order.push("readiness"); return { ready: true, reasons: [] }; },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  db.websiteSeoTemplate.findMany.mockResolvedValue([{ id: "template", key: "city", entityType: "CITY", pathPattern: "/cities/{slug}" }]);
  db.websiteSeoEntity.findMany.mockResolvedValue([]);
  db.websiteSeoPage.findMany.mockResolvedValue([]);
  db.websiteSeoKeyword.findFirst.mockResolvedValue(null);
  db.websiteSeoScaleItem.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async fn => fn(db));
  db.websiteSeoScaleRun.updateMany.mockResolvedValue({ count: 1 });
  db.websiteSeoScaleRun.findUniqueOrThrow.mockResolvedValue({ id: "run", status: "RUNNING", batchSize: 25, startedAt: new Date(), itemLimit: 10, entityType: "CITY", executionToken: null });
  db.websiteSeoScaleItem.count.mockResolvedValue(0);
  db.websiteSeoScaleItem.groupBy.mockResolvedValue([]);
  engines.automation.mockResolvedValue({ approvalMode: "ASSISTED" });
  engines.ai.mockResolvedValue({ approvalMode: "ASSISTED", generationRules: { contentDrafts: true, keywordSuggestions: true, metadataSuggestions: true, maxBatchSize: 25 } });
  engines.entity.mockImplementation(async c => ({ id: c.slug }));
  engines.page.mockImplementation(async v => ({ page: { id: `page-${v.entityId}` } }));
  engines.keywords.mockResolvedValue({ persistence: { records: [{}] } });
  engines.content.mockResolvedValue({ quality: { status: "PASS" }, persistence: { status: "SAVED" } });
  engines.seo.mockResolvedValue({ quality: { status: "PASS" }, persistence: { status: "SAVED" } });
  engines.readiness.mockResolvedValue({ readiness: { ready: true, blockingIssues: [] } });
});

describe("W15 scale controls", () => {
  it.each([["PILOT_10", 10], ["GROWTH_100", 100], ["SCALE_1000", 1000]])("enforces %s rollout size", (rolloutLevel, expected) => expect(planInput({ ...plan, rolloutLevel }).itemLimit).toBe(expected));
  it("bounds CUSTOM and rejects oversized plans", () => {
    expect(planInput({ ...plan, rolloutLevel: "CUSTOM", itemLimit: HARD_LIMIT }).itemLimit).toBe(5000);
    for (const itemLimit of [0, 5001, 1.5, NaN, "100"]) expect(() => planInput({ ...plan, rolloutLevel: "CUSTOM", itemLimit })).toThrow();
  });
  it("rejects inherited rollout names", () => expect(() => planInput({ ...plan, rolloutLevel: "toString" })).toThrow());
  it("caps execution batches at 25", () => {
    expect(planInput({ ...plan, batchSize: 25 }).batchSize).toBe(25);
    for (const batchSize of [26, 1000, 0, -1, 1.2, "25"]) expect(() => planInput({ ...plan, batchSize })).toThrow();
  });
  it("normalizes duplicate candidate keys using W2", () => {
    const a = candidateInput(input), b = candidateInput({ ...input, slug: " VERIFIED  City " });
    expect(candidateKey(a)).toBe(candidateKey(b)); expect(duplicateKeys([a, b]).has(candidateKey(a))).toBe(true);
  });
  it("classifies existing entities and conflicting names", () => {
    const c = candidateInput(input);
    expect(classify(null, c, false)).toBe("NEW");
    expect(classify({ name: "VERIFIED CITY" }, c, false)).toBe("EXISTS");
    expect(classify({ name: "Another city" }, c, false)).toBe("CONFLICT");
  });
  it.each([{ ...input, type: "UNKNOWN" }, { ...input, name: "x" }, { ...input, slug: "../city" }, { ...input, metadata: [] }, { ...input, slug: "" }])("rejects invalid input %j", value => expect(() => candidateInput(value)).toThrow());
  it.each(WEBSITE_ENTITY_TYPES)("supports %s through one candidate architecture", type => expect(candidateInput({ ...input, type }).type).toBe(type));
  it("dry run detects normalized duplicates without any writes", async () => {
    const rows = await dryRun([input, { ...input, slug: "VERIFIED CITY" }]);
    expect(rows.every(r => r.classification === "CONFLICT" && !r.eligible)).toBe(true);
    for (const store of Object.values(db)) for (const [method, fn] of Object.entries(store)) if (["create", "update"].includes(method)) expect(fn).not.toHaveBeenCalled();
  });
  it("reports invalid candidates without persisting", async () => expect((await dryRun([{ type: "bad" }]))[0].classification).toBe("INVALID"));
  it("dry run reuses an existing entity", async () => {
    db.websiteSeoEntity.findMany.mockResolvedValue([{ ...input, id: "existing", status: "ACTIVE" }]);
    const [r] = await dryRun([input]); expect(r.classification).toBe("EXISTS"); expect(r.entityId).toBe("existing"); expect(r.eligible).toBe(true);
  });
  it("rejects an occupied page path", async () => {
    db.websiteSeoPage.findMany.mockResolvedValue([{ id: "other", entityId: "other", templateId: "template", pathname: "/cities/verified-city", status: "DRAFT" }]);
    expect((await dryRun([input]))[0].classification).toBe("CONFLICT");
  });
  it("requires an unambiguous active template", async () => {
    db.websiteSeoTemplate.findMany.mockResolvedValue([]);
    expect((await dryRun([input]))[0].eligible).toBe(false);
  });
  it("guards mapped primary keyword intent", async () => {
    db.websiteSeoKeyword.findFirst.mockResolvedValue({ id: "mapped" });
    const [r] = await dryRun([input]); expect(r.cannibalization).toBe("CONFLICT"); expect(r.eligible).toBe(false);
  });
  it("guards primary keyword overlap across separate import batches", async () => {
    db.websiteSeoScaleItem.findMany.mockResolvedValue([{ id: "prior", candidateKey: "CITY:alternate", entityType: "CITY", name: input.name, slug: "alternate", metadata: input.metadata }]);
    const [r] = await dryRun([input], "run", true); expect(r.cannibalization).toBe("CONFLICT"); expect(r.eligible).toBe(false);
  });
  it("executes W2 to W7 in order with no publishing step", async () => {
    const order: string[] = [];
    const publish = vi.fn();
    const result = await runPipeline({ ...pipeline(order), publish } as ScalePipeline);
    expect(order).toEqual(["entity", "page", "keywords", "content", "seo", "readiness"]);
    expect(publish).not.toHaveBeenCalled(); expect(result.status).toBe("COMPLETED");
  });
  it("W7 readiness is the final generation gate", async () => {
    const p = pipeline(); p.readiness = async () => ({ ready: false, reasons: ["Editorial approval required"] });
    expect(await runPipeline(p)).toEqual({ status: "BLOCKED", error: "Editorial approval required" });
  });
  it.each(["keywords", "content", "seo"] as const)("blocked %s quality cannot reach publication/readiness", async stage => {
    const p = pipeline(); p[stage] = async () => false; p.readiness = vi.fn();
    expect((await runPipeline(p)).status).toBe("BLOCKED"); expect(p.readiness).not.toHaveBeenCalled();
  });
  it("pause and resume preserve explicit state transitions", () => {
    expect(transition("RUNNING", "pause")).toBe("PAUSED"); expect(transition("PAUSED", "resume")).toBe("READY");
    expect(() => transition("COMPLETED", "resume")).toThrow(); expect(() => transition("DRAFT", "pause")).toThrow();
  });
  it("isolates failed items and continues later items", async () => {
    const done: number[] = [], failures: number[] = [];
    await isolated([1, 2, 3], async i => { if (i === 2) throw new Error("failed"); done.push(i); }, async i => { failures.push(i); });
    expect(done).toEqual([1, 3]); expect(failures).toEqual([2]);
  });
  it("checks worker ownership before each engine", async () => {
    const order: string[] = []; let calls = 0;
    await expect(runPipeline(pipeline(order), async () => { if (++calls === 3) throw new Error("ownership lost"); })).rejects.toThrow("ownership lost");
    expect(order).toEqual(["entity", "page"]);
  });
  it("progress includes blocked/failed outcomes without inventing success", () => {
    expect(progress(10, 3, 2, 1)).toEqual({ total: 10, completed: 3, blocked: 2, failed: 1, processed: 6, percent: 60 });
    expect(progress(0, 0, 0, 0).percent).toBe(0);
  });
  it("missing W4 metrics stay null", () => {
    const r = analyzeKeywords({ ...candidateInput(input), id: "test-only" });
    expect(r.keywords.every(k => k.metrics.searchVolume === null && k.metrics.cpc === null && k.metrics.difficulty === null)).toBe(true);
  });
  it("parses JSON and quoted CSV metadata without dependencies", () => {
    expect(parseImport(JSON.stringify([input]))).toEqual([input]);
    expect(parseImport('type,name,slug,metadata\nCITY,"Verified, City",verified-city,"{""city"":""Verified City""}"')[0]).toEqual({ ...input, name: "Verified, City" });
    expect(() => parseImport('type,name,slug\nCITY,"unclosed,city')).toThrow();
  });
  it("bounds import and dry-run requests", async () => {
    expect(() => parseImport(JSON.stringify(Array(101).fill(input)))).toThrow();
    await expect(dryRun(Array(101).fill(input))).rejects.toThrow();
  });
  it("rejects persisted imports beyond the locked plan limit", async () => {
    db.websiteSeoScaleRun.findUniqueOrThrow.mockResolvedValue({ status: "DRAFT", entityType: "CITY", itemLimit: 10 });
    db.websiteSeoScaleItem.count.mockResolvedValue(10);
    await expect(importCandidates("run", [input])).rejects.toThrow("limit exceeded");
    expect(db.websiteSeoScaleItem.createMany).not.toHaveBeenCalled();
  });
  it("refuses to resume while the previous worker still owns the run", async () => {
    db.websiteSeoScaleRun.findUniqueOrThrow.mockResolvedValue({ status: "PAUSED", executionToken: "active" });
    await expect(controlRun("run", "resume")).rejects.toThrow("active batch");
    expect(db.websiteSeoScaleRun.updateMany).not.toHaveBeenCalled();
  });
  it("enforces W13 policy before acquiring execution ownership", async () => {
    engines.ai.mockResolvedValue({ generationRules: { contentDrafts: false, keywordSuggestions: true, metadataSuggestions: true, maxBatchSize: 25 } });
    await expect(executeRun("run")).rejects.toThrow("W13");
    expect(db.websiteSeoScaleRun.updateMany).not.toHaveBeenCalled();
  });
  it("executes isolated persisted items, caps queries, and never publishes", async () => {
    const rows = [1, 2, 3].map(n => ({ id: `item-${n}`, entityType: "CITY", name: `Verified City ${n}`, slug: `verified-city-${n}`, metadata: null }));
    db.websiteSeoScaleItem.findMany.mockImplementation(async args => args.where.status === "READY" ? rows : []);
    engines.content.mockImplementation(async ({ entityId }) => { if (entityId.endsWith("2")) throw new Error("test failure"); return { quality: { status: "PASS" }, persistence: { status: "SAVED" } }; });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await executeRun("run"); log.mockRestore();
    expect(db.websiteSeoScaleItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 25, where: { runId: "run", selected: true, status: "READY" } }));
    expect(db.websiteSeoScaleItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "item-2" }, data: expect.objectContaining({ status: "FAILED" }) }));
    expect(db.websiteSeoScaleItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "item-3" }, data: expect.objectContaining({ status: "COMPLETED" }) }));
    expect(engines.readiness).toHaveBeenCalledTimes(2); expect(engines.publish).not.toHaveBeenCalled();
  });
  it("does not start items after a persisted pause", async () => {
    db.websiteSeoScaleItem.findMany.mockImplementation(async args => args.where.status === "READY" ? [{ id: "item" }] : []);
    db.websiteSeoScaleRun.findUniqueOrThrow.mockResolvedValue({ status: "PAUSED", batchSize: 25, startedAt: new Date() });
    await executeRun("run"); expect(engines.entity).not.toHaveBeenCalled();
  });
});
