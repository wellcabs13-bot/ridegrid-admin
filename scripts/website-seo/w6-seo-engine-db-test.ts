import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { websiteContentEngine } from "../../lib/website-seo/content/engine";
import { websiteSeoEngine } from "../../lib/website-seo/seo/engine";
import { websiteSeoPlanRepository } from "../../lib/website-seo/seo/repository";

async function main() {
  const marker = `w6-${randomUUID()}`;
  let entityId: string | undefined;
  let templateId: string | undefined;
  let collisionEntityId: string | undefined;
  try {
    const entity = await prisma.websiteSeoEntity.create({ data: { type: "CITY", name: "Temporary SEO City", slug: marker, status: "ACTIVE" } });
    entityId = entity.id;
    const template = await prisma.websiteSeoTemplate.create({ data: { name: marker, key: marker, entityType: "CITY", pathPattern: "/test/{slug}",
      sections: ["HERO", "OVERVIEW", "FAQ", "CTA"].map((type, order) => ({ type, id: type, enabled: true, order })) } });
    templateId = template.id;
    const page = await prisma.websiteSeoPage.create({ data: { key: marker, pathname: `/test/${marker}`, entityId, templateId,
      metadata: { generation: { version: 1 }, preserveMarker: marker, previousPathnames: [`/old/${marker}`] } } });
    await prisma.websiteSeoKeyword.create({ data: { entityId, entityType: "CITY", keyword: "Temporary SEO City cab", normalizedKeyword: "temporary seo city cab",
      type: "PRIMARY", status: "APPROVED", intent: "TRANSACTIONAL", clusterKey: marker } });
    const missing = await websiteSeoEngine.generate({ entityId });
    assert.equal(missing.indexability.indexable, false);
    assert.ok(missing.quality.issues.some(i => i.code === "CONTENT_UNAVAILABLE"));
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), page);
    assert.equal((await websiteContentEngine.generate({ entityId, persist: true })).persistence.status, "SAVED");
    const before = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    const preview = await websiteSeoEngine.generate({ entityId });
    assert.equal(preview.persistence.status, "PREVIEW");
    assert.equal(preview.metadata.source, "W5");
    assert.equal(preview.metadata.primaryKeyword, "Temporary SEO City cab");
    assert.equal(preview.indexability.indexable, false);
    assert.equal(preview.sitemapEligibility.eligible, false);
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), before);
    const first = await websiteSeoEngine.generate({ entityId, persist: true });
    assert.equal(first.persistence.status, "SAVED");
    const saved = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    const second = await websiteSeoEngine.generate({ entityId, persist: true });
    assert.equal(second.persistence.status, "UNCHANGED");
    assert.deepEqual(second.generation, first.generation);
    assert.deepEqual(second.metadata, first.metadata);
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), saved);
    const metadata = saved.metadata as Prisma.JsonObject;
    assert.equal(metadata.preserveMarker, marker);
    assert.deepEqual(metadata.contentW5, (before.metadata as Prisma.JsonObject).contentW5);
    assert.deepEqual(metadata.generation, { version: 1 });
    assert.equal(saved.status, "DRAFT");
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: { ...metadata, seo: { title: "Editorial title", owner: "HUMAN" } } as Prisma.InputJsonObject } });
    const manual = await prisma.websiteSeoPage.findUnique({ where: { id: page.id } });
    assert.equal((await websiteSeoEngine.generate({ entityId, persist: true })).persistence.status, "SKIPPED");
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), manual);
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { status: "PUBLISHED" } });
    const published = await prisma.websiteSeoPage.findUnique({ where: { id: page.id } });
    assert.equal((await websiteSeoEngine.generate({ entityId, persist: true })).persistence.status, "SKIPPED");
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), published);
    const collisionEntity = await prisma.websiteSeoEntity.create({ data: { type: "CITY", name: "Temporary Canonical Collision", slug: `${marker}-collision` } });
    collisionEntityId = collisionEntity.id;
    await prisma.websiteSeoPage.create({ data: { key: `${marker}-duplicate`, pathname: `/test/${marker}/`, entityId: collisionEntityId, templateId } });
    const conflict = await websiteSeoEngine.generate({ entityId });
    assert.ok(conflict.quality.issues.some(i => i.code === "CANONICAL_CONFLICT"));
    assert.equal(conflict.indexability.indexable, false);
    const duplicateMetadata = await websiteSeoPlanRepository.duplicateMetadata("not-this-page", first.metadata.title, first.metadata.description);
    assert.equal(duplicateMetadata.duplicateTitle, true); assert.equal(duplicateMetadata.duplicateDescription, true);
    console.log("W6 PostgreSQL PASS: W4/W5 consumption, preview, idempotency, metadata/lifecycle/editorial preservation, duplicate detection.");
  } finally {
    if (collisionEntityId) {
      await prisma.websiteSeoPage.deleteMany({ where: { entityId: collisionEntityId } });
      await prisma.websiteSeoEntity.delete({ where: { id: collisionEntityId } });
      assert.equal(await prisma.websiteSeoEntity.count({ where: { id: collisionEntityId } }), 0);
      assert.equal(await prisma.websiteSeoPage.count({ where: { entityId: collisionEntityId } }), 0);
    }
    if (entityId) {
      await prisma.websiteSeoKeyword.deleteMany({ where: { entityId } });
      await prisma.websiteSeoPage.deleteMany({ where: { entityId } });
      await prisma.websiteSeoEntity.delete({ where: { id: entityId } });
    }
    if (templateId) await prisma.websiteSeoTemplate.delete({ where: { id: templateId } });
    if (entityId) {
      assert.equal(await prisma.websiteSeoPage.count({ where: { entityId } }), 0);
      assert.equal(await prisma.websiteSeoKeyword.count({ where: { entityId } }), 0);
      assert.equal(await prisma.websiteSeoEntity.count({ where: { id: entityId } }), 0);
    }
    if (templateId) assert.equal(await prisma.websiteSeoTemplate.count({ where: { id: templateId } }), 0);
    console.log("W6 cleanup PASS: no temporary entities, pages, templates or keywords remain.");
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
