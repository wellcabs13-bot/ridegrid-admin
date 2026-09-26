import { prisma } from "@/lib/prisma";
import { WEBSITE_ENTITY_TYPES } from "../entities/types";
import { publishingIndexingEngine } from "../publishing/engine";
import { governance } from "./service";

export async function overview() {
  const coverage = [];
  for (const entityType of WEBSITE_ENTITY_TYPES) {
    const pageWhere = { entity: { type: entityType } };
    const [entities, pages, published, ready, blocked, keywords, content, seo, coveredEntities] = await sequential([
      () => prisma.websiteSeoEntity.count({ where: { type: entityType } }),
      () => prisma.websiteSeoPage.count({ where: pageWhere }),
      () => prisma.websiteSeoPage.count({ where: { ...pageWhere, status: "PUBLISHED" } }),
      () => prisma.websiteSeoPage.count({ where: { ...pageWhere, status: "READY" } }),
      () => prisma.websiteSeoPage.count({ where: { ...pageWhere, OR: [
        { metadata: { path: ["contentW5", "result", "quality", "status"], equals: "BLOCKED" } },
        { metadata: { path: ["contentW5", "result", "quality", "status"], equals: "REVIEW" } },
        { metadata: { path: ["seoW6", "plan", "quality", "status"], equals: "BLOCKED" } },
        { metadata: { path: ["seoW6", "plan", "quality", "status"], equals: "REVIEW" } },
      ] } }),
      () => prisma.websiteSeoKeyword.count({ where: { entityType } }),
      () => prisma.websiteSeoPage.count({ where: { ...pageWhere, metadata: { path: ["contentW5", "engine"], equals: "W5" } } }),
      () => prisma.websiteSeoPage.count({ where: { ...pageWhere, metadata: { path: ["seoW6", "engine"], equals: "W6" } } }),
      () => prisma.websiteSeoEntity.count({ where: { type: entityType, generatedPages: { some: {} } } }),
    ]);
    coverage.push({ entityType, entities, pages, published, ready, blocked, keywords, content, seo, coveragePercent: entities ? Math.round(coveredEntities / entities * 100) : null });
  }
  return { coverage, governance: await governance(), metrics: { searchVolume: null, opportunity: null },
    definitions: "Ready = W3 READY lifecycle; blocked = persisted W5/W6 non-pass quality. Missing/unpersisted quality is unassessed. Live W7 readiness is checked separately, 25 pages at a time." };
}
export async function quality(cursor?: string) {
  const pages = await prisma.websiteSeoPage.findMany({ where: cursor ? { id: { gt: cursor } } : {}, orderBy: { id: "asc" }, take: 26, select: { id: true, entityId: true, pathname: true, status: true } });
  const items = [];
  for (const page of pages.slice(0, 25)) {
    try { const r = await publishingIndexingEngine.preview(page.entityId, page.id); items.push({ ...page, ready: r.readiness.ready, reasons: r.readiness.blockingIssues.map(i => i.message) }); }
    catch { items.push({ ...page, ready: false, reasons: ["W7 readiness unavailable; inspect entity/content/SEO state."] }); }
  }
  return { items, nextCursor: pages.length > 25 ? pages[24].id : null, checkedAt: new Date().toISOString() };
}

// Keep reporting from exhausting a low-connection production pool.
async function sequential(reads: Array<() => PromiseLike<number>>) {
  const values: number[] = [];
  for (const read of reads) values.push(await read());
  return values;
}
