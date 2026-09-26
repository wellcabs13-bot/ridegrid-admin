import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { websiteSeoEngine } from "../../lib/website-seo/seo/engine";
import { publishingIndexingEngine } from "../../lib/website-seo/publishing/engine";
import { publishedPageResponse } from "../../lib/website-seo/publishing/public";
import { w7FixtureContent, w7FixtureMetadata } from "./w7-test-fixture";

async function main() {
  const marker = `w7-${randomUUID()}`;
  const originalOrigin = process.env.WEBSITE_SEO_SITE_URL;
  process.env.WEBSITE_SEO_SITE_URL = "https://example.test"; // Test process only; no network requests.
  let entityId: string | undefined; let templateId: string | undefined;
  try {
    const entity = await prisma.websiteSeoEntity.create({ data: { type: "CITY", name: "Temporary Travel", slug: marker, status: "ACTIVE", metadata: w7FixtureMetadata } });
    entityId = entity.id;
    const template = await prisma.websiteSeoTemplate.create({ data: { name: marker, key: marker, entityType: "CITY", status: "ACTIVE", pathPattern: "/cities/{slug}",
      sections: [{ id: "overview", type: "OVERVIEW", enabled: true, order: 0 }] } });
    templateId = template.id;
    const page = await prisma.websiteSeoPage.create({ data: { entityId, templateId, key: marker, pathname: `/cities/${marker}` } });
    await prisma.websiteSeoKeyword.create({ data: { entityId, entityType: "CITY", keyword: "Temporary Travel guide", normalizedKeyword: "temporary travel guide", type: "PRIMARY",
      intent: "INFORMATIONAL", status: "APPROVED", clusterKey: marker } });
    const contentW5 = { engine: "W5", editorialStatus: "APPROVED", result: { ...w7FixtureContent(), entity: { id: entityId }, page: { id: page.id }, brief: { templateId } } };
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: { marker, contentW5 } as unknown as Prisma.InputJsonObject } });
    const before = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    assert.equal((await publishingIndexingEngine.publish(entityId, page.id, true)).readiness.ready, false);
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), before);
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { status: "READY" } });
    assert.equal((await websiteSeoEngine.generate({ entityId, pageId: page.id, persist: true })).quality.status, "PASS");
    const ready = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    assert.equal((await publishingIndexingEngine.publish(entityId, page.id, true)).readiness.ready, true);
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), ready);
    assert.equal((await publishingIndexingEngine.publish(entityId, page.id)).activity?.outcome, "CHANGED");
    const published = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    assert.equal((await publishingIndexingEngine.publish(entityId, page.id)).activity?.outcome, "UNCHANGED");
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), published);
    assert.equal((published.metadata as Prisma.JsonObject).marker, marker);
    assert.deepEqual((published.metadata as Prisma.JsonObject).contentW5, contentW5);
    assert.equal((await publishedPageResponse(page.pathname)).status, 200);
    assert.ok((await publishingIndexingEngine.sitemapEntries()).some(e => e.url.endsWith(marker)));
    const sync = await publishingIndexingEngine.sync(entityId, page.id);
    assert.equal(sync.observation.external.coverage, "UNKNOWN");
    const synced = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    assert.equal((await publishingIndexingEngine.sync(entityId, page.id)).outcome, "UNCHANGED");
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), synced);
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: { ...(synced.metadata as Prisma.InputJsonObject), publicationLocked: true } } });
    await assert.rejects(() => publishingIndexingEngine.unpublish(entityId!, page.id));
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: synced.metadata as Prisma.InputJsonObject } });
    assert.equal((await publishingIndexingEngine.unpublish(entityId, page.id)).status, "READY");
    const unpublished = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    assert.deepEqual((unpublished.metadata as Prisma.JsonObject).contentW5, contentW5);
    assert.equal((await publishedPageResponse(page.pathname)).status, 404);
    assert.ok(!(await publishingIndexingEngine.sitemapEntries()).some(e => e.url.endsWith(marker)));
    await assert.rejects(() => publishingIndexingEngine.sync(entityId!, page.id));
    console.log("W7 PostgreSQL PASS: preview, publish/unpublish, public output, sitemap, ownership, idempotent sync, UNKNOWN external state.");
  } finally {
    if (entityId) {
      await prisma.websiteSeoPage.deleteMany({ where: { entityId } }); await prisma.websiteSeoKeyword.deleteMany({ where: { entityId } });
      await prisma.websiteSeoEntity.delete({ where: { id: entityId } });
      assert.equal(await prisma.websiteSeoPage.count({ where: { entityId } }), 0); assert.equal(await prisma.websiteSeoKeyword.count({ where: { entityId } }), 0);
      assert.equal(await prisma.websiteSeoEntity.count({ where: { id: entityId } }), 0);
    }
    if (templateId) { await prisma.websiteSeoTemplate.delete({ where: { id: templateId } }); assert.equal(await prisma.websiteSeoTemplate.count({ where: { id: templateId } }), 0); }
    if (originalOrigin === undefined) delete process.env.WEBSITE_SEO_SITE_URL; else process.env.WEBSITE_SEO_SITE_URL = originalOrigin;
    console.log("W7 cleanup PASS: no temporary data remains.");
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
