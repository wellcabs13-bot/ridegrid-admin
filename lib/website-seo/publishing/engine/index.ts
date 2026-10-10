import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { prisma } from "@/lib/prisma";
import { loadSeoInput, seoObject } from "../../seo/engine/load";
import { createSeoPlan } from "../../seo/engine/plan";
import { websiteSeoPlanRepository } from "../../seo/repository";
import { resolveSeoCanonical } from "../../seo/canonical";
import { publicationReadiness } from "../readiness";
import { publicationDiscovery, publicationSitemapEntry } from "../discovery";
import { publicationSnapshot, publicationRevision, publicationProtected, writePublication } from "../repository";
import { localIndexingProvider, type IndexingProvider } from "../providers";
import { PublishingError, type IndexingStatus, type SitemapEntry } from "../types";

export class PublishingIndexingEngine {
  constructor(private readonly provider: IndexingProvider = localIndexingProvider) {}
  async preview(entityId: string, pageId: string) {
    const snapshot = await publicationSnapshot(pageId, entityId);
    const loaded = await loadSeoInput(entityId, pageId);
    const projectedInput = { ...loaded.input, page: { ...loaded.input.page, status: "PUBLISHED" } };
    const initial = createSeoPlan(projectedInput);
    const duplicates = await websiteSeoPlanRepository.duplicateMetadata(pageId, initial.metadata.title, initial.metadata.description);
    const plan = createSeoPlan({ ...projectedInput, ...duplicates });
    const metadata = seoObject(snapshot.metadata); const stored = seoObject(metadata.seoW6); const storedPlan = seoObject(stored.plan);
    const readiness = publicationReadiness(snapshot.status, plan, {
      exists: stored.engine === "W6" && seoObject(storedPlan.page).id === pageId && seoObject(storedPlan.entity).id === entityId,
      indexable: seoObject(storedPlan.indexability).indexable === true && seoObject(storedPlan.quality).status === "PASS",
    }, publicationProtected(metadata));
    if (publicationRevision(await publicationSnapshot(pageId, entityId)) !== publicationRevision(snapshot)) throw new PublishingError("Source changed during readiness evaluation.");
    return { snapshot, plan, readiness, content: loaded.input.content };
  }
  async publish(entityId: string, pageId: string, preview = false) {
    const result = await this.preview(entityId, pageId);
    const { snapshot, plan, readiness } = result;
    if (preview) return { pageId, status: snapshot.status, readiness, discovery: publicationDiscovery(snapshot.status, plan), activity: null, plan };
    if (!readiness.ready) return { pageId, status: snapshot.status, readiness, activity: { action: "PUBLISH", outcome: "BLOCKED", occurredAt: null } };
    const existing = seoObject(seoObject(snapshot.metadata).publishing);
    if (snapshot.status === "PUBLISHED") {
      if (existing.engine !== "W7") throw new PublishingError("An existing manual publication cannot be adopted automatically.");
      return { pageId, status: snapshot.status, readiness, discovery: publicationDiscovery(snapshot.status, plan), activity: { action: "PUBLISH", outcome: "UNCHANGED", occurredAt: null } };
    }
    const now = new Date().toISOString();
    await writePublication(snapshot, { publishing: { ...existing, engine: "W7", status: "PUBLISHED", publishedAt: now,
      planFingerprint: plan.generation.fingerprint, activity: { action: "PUBLISH", outcome: "CHANGED", occurredAt: now } } }, "PUBLISHED");
    return { pageId, status: "PUBLISHED", readiness, discovery: publicationDiscovery("PUBLISHED", plan), activity: { action: "PUBLISH", outcome: "CHANGED", occurredAt: now } };
  }
  async unpublish(entityId: string, pageId: string) {
    const snapshot = await publicationSnapshot(pageId, entityId);
    if (publicationProtected(snapshot.metadata)) throw new PublishingError("Publication is manually protected.");
    if (snapshot.status !== "PUBLISHED") return { pageId, status: snapshot.status, activity: { action: "UNPUBLISH", outcome: "UNCHANGED", occurredAt: null } };
    const metadata = seoObject(snapshot.metadata); const existing = seoObject(metadata.publishing);
    if (existing.engine !== "W7") throw new PublishingError("Manual publication must be managed by its owner.");
    const now = new Date().toISOString();
    await writePublication(snapshot, { publishing: { ...existing, status: "READY", unpublishedAt: now,
      activity: { action: "UNPUBLISH", outcome: "CHANGED", occurredAt: now } } }, "READY");
    // External observations remain historical facts, not fabricated deindexing acknowledgements.
    return { pageId, status: "READY", discovery: { published: false, crawlEligible: false, sitemapIncluded: false },
      activity: { action: "UNPUBLISH", outcome: "CHANGED", occurredAt: now } };
  }
  async sync(entityId: string, pageId: string) {
    const { snapshot, plan, readiness } = await this.preview(entityId, pageId);
    if (snapshot.status !== "PUBLISHED" || !readiness.ready || !plan.canonical.url) throw new PublishingError("Only eligible published pages may synchronize discovery.");
    const metadata = seoObject(snapshot.metadata); const existing = seoObject(metadata.indexing);
    if (metadata.indexing !== undefined && existing.engine !== "W7") throw new PublishingError("Indexing metadata is manually owned.");
    const sitemapUrl = new URL("/api/website-seo/sitemap", plan.canonical.url).href;
    const key = createHash("sha256").update(`${pageId}:${plan.canonical.url}:${this.provider.id}`).digest("hex");
    let observation: IndexingStatus;
    try {
      observation = existing.idempotencyKey === key && seoObject(existing.observation).requestState === "ACCEPTED"
        ? await this.provider.getStatus(plan.canonical.url)
        : await this.provider.submitDiscovery({ pageId, url: plan.canonical.url, sitemapUrl, idempotencyKey: key });
    } catch { throw new PublishingError("Discovery provider unavailable; external state was not changed.", 502); }
    if (existing.idempotencyKey === key && seoObject(existing.observation).requestState === "ACCEPTED" && observation.requestState === "NOT_SENT") {
      observation = { ...observation, requestState: "ACCEPTED" };
    }
    if (existing.idempotencyKey === key && isDeepStrictEqual(existing.observation, observation)) return { pageId, outcome: "UNCHANGED", observation };
    await writePublication(snapshot, { indexing: { engine: "W7", idempotencyKey: key, observation } }, null);
    return { pageId, outcome: "CHANGED", observation };
  }
  async sitemapEntries(): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = []; let cursor: string | undefined;
    for (;;) {
      const pages = await prisma.websiteSeoPage.findMany({ where: { status: "PUBLISHED" }, orderBy: { id: "asc" }, take: 200,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, entityId: true, metadata: true } });
      if (!pages.length) break;
      for (const page of pages) {
        const publishing = seoObject(seoObject(page.metadata).publishing);
        if (publishing.engine !== "W7") continue;
        try {
          const current = await this.preview(page.entityId, page.id);
          if (!current.readiness.ready) continue;
          const date = typeof publishing.publishedAt === "string" && Number.isFinite(Date.parse(publishing.publishedAt)) ? new Date(publishing.publishedAt) : undefined;
          const entry = publicationSitemapEntry(publicationDiscovery("PUBLISHED", current.plan), date);
          if (entry) entries.push(entry);
        } catch { /* Invalid or concurrently changed pages fail closed. */ }
      }
      cursor = pages[pages.length - 1].id;
    }
    return entries;
  }
}
export const publishingIndexingEngine = new PublishingIndexingEngine();
export function sitemapAbsoluteUrl(): string | null {
  return resolveSeoCanonical("/api/website-seo/sitemap", process.env.WEBSITE_SEO_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL).url;
}
