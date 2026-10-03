import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { websiteEntityRepository } from "../entities/repository";
import { websitePageGenerationService } from "../pages/generation-service";
import { keywordIntelligenceEngine } from "../keywords/engine";
import { websiteContentEngine } from "../content/engine";
import { websiteSeoEngine } from "../seo/engine";
import { publishingIndexingEngine } from "../publishing/engine";
import { websiteAutomationRepository } from "../automation/repository";
import { websiteSeoAiControlRepository } from "../ai-control/repository";
import { websiteSeoConfig } from "../config";
import { candidateInput, candidateKey, object, planInput, progress, transition, IMPORT_LIMIT } from "./logic";
import { dryRun } from "./candidates";
import { isolated, runPipeline } from "./pipeline";

export async function governance() {
  const [automation, ai] = await Promise.all([websiteAutomationRepository.load(), websiteSeoAiControlRepository.load()]);
  return { automationMode: automation.approvalMode, aiMode: ai.approvalMode, publishingEnabled: websiteSeoConfig.publishingEnabled,
    generationAllowed: ai.generationRules.contentDrafts && ai.generationRules.keywordSuggestions && ai.generationRules.metadataSuggestions,
    batchLimit: Math.max(1, Math.min(25, Number.isInteger(ai.generationRules.maxBatchSize) ? ai.generationRules.maxBatchSize : 1)),
    publicationLabel: websiteSeoConfig.publishingEnabled ? "READY FOR PUBLICATION / SEPARATE GOVERNED REVIEW REQUIRED" : "READY FOR PUBLICATION / PUBLISHING DISABLED" };
}
export const createPlan = (value: unknown) => prisma.websiteSeoScaleRun.create({ data: planInput(value) });

export async function importCandidates(runId: string, values: unknown[]) {
  const inspection = await dryRun(values, runId);
  if (inspection.some(r => r.classification === "INVALID" || r.classification === "CONFLICT")) throw new Error("Resolve invalid/conflicting candidates in dry run before importing.");
  const candidates = inspection.map(r => r.candidate!);
  return prisma.$transaction(async tx => {
    // A row lock serializes imports/approval against plan transitions and limit checks.
    await tx.websiteSeoScaleRun.update({ where: { id: runId }, data: { updatedAt: new Date() } });
    const run = await tx.websiteSeoScaleRun.findUniqueOrThrow({ where: { id: runId } });
    if (run.status !== "DRAFT") throw new Error("Only DRAFT plans accept candidates.");
    if (candidates.some(c => c.type !== run.entityType)) throw new Error("Candidate type must match plan.");
    const count = await tx.websiteSeoScaleItem.count({ where: { runId } });
    if (count + candidates.length > run.itemLimit) throw new Error("Plan rollout limit exceeded.");
    await tx.websiteSeoScaleItem.createMany({ data: candidates.map(c => ({ runId, candidateKey: candidateKey(c), entityType: c.type, name: c.name, slug: c.slug, metadata: c.metadata === null ? Prisma.JsonNull : c.metadata as Prisma.InputJsonValue })) });
    return { imported: candidates.length };
  });
}

export async function selectCandidates(runId: string, ids: string[], selected: boolean) {
  if (!ids.length || ids.length > IMPORT_LIMIT || ids.some(id => typeof id !== "string")) throw new Error("Select 1–100 item ids.");
  const items = await prisma.websiteSeoScaleItem.findMany({ where: { runId, id: { in: ids } }, take: IMPORT_LIMIT });
  if (items.length !== new Set(ids).size) throw new Error("Unknown candidate.");
  const inspected = selected ? await dryRun(items.map(i => ({ type: i.entityType, name: i.name, slug: i.slug, metadata: i.metadata })), runId, true) : [];
  if (inspected.some(r => !r.eligible)) throw new Error("Selected candidates are blocked. Refresh dry run and resolve conflicts/templates first.");
  return prisma.$transaction(async tx => {
    await tx.websiteSeoScaleRun.update({ where: { id: runId }, data: { updatedAt: new Date() } });
    const run = await tx.websiteSeoScaleRun.findUniqueOrThrow({ where: { id: runId } });
    if (run.status !== "DRAFT") throw new Error("Selection is only editable in DRAFT.");
    return tx.websiteSeoScaleItem.updateMany({ where: { runId, id: { in: ids } }, data: { selected, status: selected ? "READY" : "PENDING" } });
  });
}

export async function runDetail(id: string, cursor?: string, status?: string) {
  const run = await prisma.websiteSeoScaleRun.findUniqueOrThrow({ where: { id } });
  const [groups, candidateCount, items] = await Promise.all([
    prisma.websiteSeoScaleItem.groupBy({ by: ["status"], where: { runId: id, selected: true }, _count: true }),
    prisma.websiteSeoScaleItem.count({ where: { runId: id } }),
    prisma.websiteSeoScaleItem.findMany({ where: { runId: id, ...(status ? { status } : {}), ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take: 51, select: { id: true, entityType: true, name: true, slug: true, selected: true, status: true, entityId: true, pageId: true, error: true } }),
  ]);
  const count = (s: string) => groups.find(g => g.status === s)?._count ?? 0;
  const { executionToken, ...safeRun } = run;
  return { run: { ...safeRun, executing: !!executionToken, candidateCount, ...progress(groups.reduce((n, g) => n + g._count, 0), count("COMPLETED"), count("BLOCKED"), count("FAILED")) }, items: items.slice(0, 50), nextCursor: items.length > 50 ? items[49].id : null };
}

export async function controlRun(id: string, action: string) {
  if (action === "ready") {
    return prisma.$transaction(async tx => {
      await tx.websiteSeoScaleRun.update({ where: { id }, data: { updatedAt: new Date() } });
      const run = await tx.websiteSeoScaleRun.findUniqueOrThrow({ where: { id } });
      const count = await tx.websiteSeoScaleItem.count({ where: { runId: id, selected: true, status: "READY" } });
      if (run.status !== "DRAFT" || !count || count > run.itemLimit) throw new Error("Select eligible candidates in a DRAFT plan first.");
      return tx.websiteSeoScaleRun.update({ where: { id }, data: { status: "READY" } });
    });
  }
  const run = await prisma.websiteSeoScaleRun.findUniqueOrThrow({ where: { id } });
  const status = transition(run.status, action);
  if (action === "resume" && run.executionToken) throw new Error("Wait for the active batch to finish before resuming.");
  const result = await prisma.websiteSeoScaleRun.updateMany({ where: { id, status: run.status, ...(action === "resume" ? { executionToken: null } : {}) }, data: { status } });
  if (!result.count) throw new Error("Run changed; reload.");
  return { status };
}

// Recovery deliberately does not clear a live/uncertain worker lock. An administrator
// must establish worker termination before releasing it outside the HTTP pipeline.
// No lease expiry may permit an old W3/W5 writer to overlap a replacement worker.
export async function executeRun(id: string) {
  const policy = await governance();
  if (!policy.generationAllowed) throw new Error("W13 generation rules prohibit this package.");
  const token = randomUUID();
  const claimed = await prisma.websiteSeoScaleRun.updateMany({ where: { id, status: { in: ["READY", "RUNNING"] }, executionToken: null }, data: { executionToken: token, status: "RUNNING", heartbeatAt: new Date() } });
  if (!claimed.count) throw new Error("Run is paused, terminal, or already executing.");
  try {
    const run = await prisma.websiteSeoScaleRun.findUniqueOrThrow({ where: { id } });
    if (!run.startedAt) await prisma.websiteSeoScaleRun.update({ where: { id }, data: { startedAt: new Date() } });
    const items = await prisma.websiteSeoScaleItem.findMany({ where: { runId: id, selected: true, status: "READY" }, take: Math.min(25, run.batchSize, policy.batchLimit), orderBy: { id: "asc" } });
    await isolated(items, async item => {
      const state = await prisma.websiteSeoScaleRun.findUniqueOrThrow({ where: { id } });
      if (state.status === "PAUSED") return;
      await prisma.websiteSeoScaleItem.update({ where: { id: item.id }, data: { status: "RUNNING", error: null } });
      const c = candidateInput({ type: item.entityType, name: item.name, slug: item.slug, metadata: item.metadata });
      const [check] = await dryRun([c], id, true);
      if (!check.eligible) { await prisma.websiteSeoScaleItem.update({ where: { id: item.id }, data: { status: "BLOCKED", error: check.reasons.join(" ") } }); return; }
      const save = async (data: { entityId?: string; pageId?: string }) => { await prisma.websiteSeoScaleItem.update({ where: { id: item.id }, data }); };
      const outcome = await runPipeline({
        entity: async () => { const entity = check.entityId ? await websiteEntityRepository.findById(check.entityId) : await websiteEntityRepository.create(c); if (!entity) throw new Error("Entity no longer exists."); await save({ entityId: entity.id }); return entity.id; },
        page: async entityId => {
          // Re-read after entity creation; never regenerate existing metadata/lifecycle.
          const existing = await prisma.websiteSeoPage.findMany({ where: { entityId }, take: 2 });
          if (existing.length > 1 || existing[0] && (existing[0].pathname !== check.path || existing[0].templateId !== check.templateId || existing[0].status === "ARCHIVED")) throw new Error("Page mapping changed; review in Page Factory.");
          const page = existing[0] ?? (await websitePageGenerationService.generateAndPersist({ entityId, templateId: check.templateId! })).page;
          await save({ pageId: page.id }); return page.id;
        },
        keywords: async entityId => { const result = await keywordIntelligenceEngine.generate(entityId, true); const [recheck] = await dryRun([c]); return !!result.persistence?.records.length && recheck.cannibalization === "CLEAR"; },
        content: async (entityId, pageId) => { const r = await websiteContentEngine.generate({ entityId, pageId, persist: true }); return r.quality.status === "PASS" && !["SKIPPED", "PREVIEW"].includes(r.persistence.status); },
        seo: async (entityId, pageId) => { const r = await websiteSeoEngine.generate({ entityId, pageId, persist: true }); return r.quality.status === "PASS" && !["SKIPPED", "PREVIEW"].includes(r.persistence.status); },
        readiness: async (entityId, pageId) => { const r = await publishingIndexingEngine.preview(entityId, pageId); return { ready: r.readiness.ready, reasons: r.readiness.blockingIssues.map(i => i.message) }; },
      }, async () => {
        const currentPolicy = await governance();
        if (!currentPolicy.generationAllowed) throw new Error("W13 generation policy changed; review item.");
        const alive = await prisma.websiteSeoScaleRun.updateMany({ where: { id, executionToken: token }, data: { heartbeatAt: new Date() } });
        if (!alive.count) throw new Error("Worker ownership lost.");
      });
      await prisma.websiteSeoScaleItem.update({ where: { id: item.id }, data: outcome });
    }, async (item, error) => {
      console.error("[W15 item failure]", item.id, error);
      await prisma.websiteSeoScaleItem.update({ where: { id: item.id }, data: { status: "FAILED", error: "Generation failed. Review engine state before creating a retry plan." } });
    });
    const pending = await prisma.websiteSeoScaleItem.count({ where: { runId: id, selected: true, status: { in: ["READY", "RUNNING"] } } });
    if (!pending) {
      const failures = await prisma.websiteSeoScaleItem.count({ where: { runId: id, status: "FAILED" } });
      await prisma.websiteSeoScaleRun.updateMany({ where: { id, executionToken: token }, data: { status: failures ? "FAILED" : "COMPLETED", completedAt: new Date() } });
    }
  } catch (error) {
    // An interrupted batch must not strand RUNNING items or repeat uncertain writes.
    await prisma.websiteSeoScaleItem.updateMany({ where: { runId: id, status: "RUNNING" }, data: { status: "FAILED", error: "Batch interrupted. Review persisted engine state in a separate retry plan." } });
    await prisma.websiteSeoScaleRun.updateMany({ where: { id, executionToken: token }, data: { status: "PAUSED" } });
    throw error;
  } finally {
    await prisma.websiteSeoScaleRun.updateMany({ where: { id, executionToken: token }, data: { executionToken: null } });
  }
  return runDetail(id);
}

export async function existingCandidates(type: unknown, cursor?: string) {
  const valid = planInput({ name: "lookup", entityType: type, rolloutLevel: "PILOT_10", batchSize: 1 });
  const rows = await prisma.websiteSeoEntity.findMany({ where: { type: valid.entityType, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take: 51, select: { id: true, type: true, name: true, slug: true, status: true } });
  return { items: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
}
export async function importExisting(runId: string, ids: unknown) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(i => typeof i !== "string")) throw new Error("Choose 1–100 existing entities.");
  const rows = await prisma.websiteSeoEntity.findMany({ where: { id: { in: ids } }, take: 100 });
  if (rows.length !== new Set(ids).size) throw new Error("Entity not found.");
  return importCandidates(runId, rows.map(e => ({ type: e.type, name: e.name, slug: e.slug, metadata: e.metadata })));
}
export async function inspectSaved(runId: string, ids: unknown) {
  const v = object({ ids });
  if (!Array.isArray(v.ids) || !v.ids.length || v.ids.length > 100 || v.ids.some(i => typeof i !== "string")) throw new Error("Choose 1–100 candidates.");
  const rows = await prisma.websiteSeoScaleItem.findMany({ where: { runId, id: { in: v.ids } }, take: 100 });
  return dryRun(rows.map(i => ({ type: i.entityType, name: i.name, slug: i.slug, metadata: i.metadata })), runId, true);
}
