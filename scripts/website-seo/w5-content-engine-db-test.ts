import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { WebsiteContentEngine, websiteContentEngine } from "../../lib/website-seo/content/engine";
import { localContentProvider } from "../../lib/website-seo/content/providers";
import { parseGeneratedContent } from "../../lib/website-seo/content/generation/validate";

async function main() {
  const marker = `w5-${randomUUID()}`;
  const entities: string[] = [];
  let templateId: string | undefined;
  try {
    const entity = await prisma.websiteSeoEntity.create({ data: { type: "CITY", name: "Temporary Content City", slug: marker,
      metadata: { source: "W5_TEST", city: "Temporary Content City" } } });
    entities.push(entity.id);
    const child = await prisma.websiteSeoEntity.create({ data: { type: "CITY", name: "Temporary Related City", slug: `${marker}-child`, parentId: entity.id } });
    entities.push(child.id);
    const template = await prisma.websiteSeoTemplate.create({ data: { name: marker, key: marker, entityType: "CITY", status: "DRAFT", pathPattern: "/test/{slug}",
      sections: ["HERO", "OVERVIEW", "SEARCH", "PRICING", "FAQ", "RELATED", "CTA"].map((type, order) => ({ id: type, type, enabled: true, order })) } });
    templateId = template.id;
    const page = await prisma.websiteSeoPage.create({ data: { key: marker, pathname: `/test/${marker}`, entityId: entity.id, templateId,
      metadata: { generation: { version: 1 }, preserveMarker: marker } } });
    const relatedPage = await prisma.websiteSeoPage.create({ data: { key: `${marker}-child`, pathname: `/test/${marker}-child`,
      entityId: child.id, templateId, status: "PUBLISHED" } });
    await prisma.websiteSeoKeyword.create({ data: { keyword: "Temporary Content City cab", normalizedKeyword: "temporary content city cab", type: "PRIMARY",
      intent: "TRANSACTIONAL", status: "APPROVED", entityId: entity.id, entityType: "CITY", clusterKey: marker } });
    const preview = await websiteContentEngine.generate({ entityId: entity.id });
    assert.equal(preview.persistence.status, "PREVIEW");
    assert.notEqual(preview.quality.status, "BLOCKED");
    assert.ok(preview.brief.internalLinks.some(l => l.pageId === relatedPage.id));
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), page);
    const first = await websiteContentEngine.generate({ entityId: entity.id, persist: true });
    assert.equal(first.persistence.status, "SAVED");
    const saved = await prisma.websiteSeoPage.findUniqueOrThrow({ where: { id: page.id } });
    const second = await websiteContentEngine.generate({ entityId: entity.id, persist: true });
    assert.equal(second.persistence.status, "UNCHANGED");
    assert.deepEqual(second.sections, first.sections);
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), saved);
    const metadata = saved.metadata as Prisma.JsonObject;
    assert.equal(metadata.preserveMarker, marker);
    assert.deepEqual(metadata.generation, { version: 1 });
    assert.equal(saved.status, "DRAFT");
    await assert.rejects(() => websiteContentEngine.generate({ entityId: entity.id, pageId: relatedPage.id }));
    const protectedMetadata = { ...metadata, contentW5: { ...(metadata.contentW5 as Prisma.JsonObject), editorialStatus: "APPROVED" } } as Prisma.InputJsonObject;
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: protectedMetadata } });
    assert.equal((await websiteContentEngine.generate({ entityId: entity.id, persist: true })).persistence.status, "SKIPPED");
    await prisma.websiteSeoPage.update({ where: { id: page.id }, data: { status: "PUBLISHED" } });
    const published = await prisma.websiteSeoPage.findUnique({ where: { id: page.id } });
    assert.equal((await websiteContentEngine.generate({ entityId: entity.id, persist: true })).persistence.status, "SKIPPED");
    assert.deepEqual(await prisma.websiteSeoPage.findUnique({ where: { id: page.id } }), published);
    const unsafe = new WebsiteContentEngine({ id: "unsafe-test", async generate(brief) {
      const draft = parseGeneratedContent(await localContentProvider.generate(brief));
      draft.sections.find(s => s.type === "OVERVIEW")!.paragraphs.push("Guaranteed fare ₹100");
      return draft;
    } });
    const blocked = await unsafe.generate({ entityId: entity.id, persist: true });
    assert.equal(blocked.quality.status, "BLOCKED"); assert.equal(blocked.persistence.status, "SKIPPED");
    console.log("W5 DB PASS: preview, mapped links, idempotency, metadata/lifecycle preservation, ownership, guardrails.");
  } finally {
    if (entities.length) {
      await prisma.websiteSeoKeyword.deleteMany({ where: { entityId: { in: entities } } });
      await prisma.websiteSeoPage.deleteMany({ where: { entityId: { in: entities } } });
      await prisma.websiteSeoEntity.deleteMany({ where: { id: { in: entities } } });
    }
    if (templateId) await prisma.websiteSeoTemplate.delete({ where: { id: templateId } });
    assert.equal(await prisma.websiteSeoEntity.count({ where: { id: { in: entities } } }), 0);
    assert.equal(await prisma.websiteSeoKeyword.count({ where: { entityId: { in: entities } } }), 0);
    assert.equal(await prisma.websiteSeoPage.count({ where: { entityId: { in: entities } } }), 0);
    if (templateId) assert.equal(await prisma.websiteSeoTemplate.count({ where: { id: templateId } }), 0);
    console.log("W5 DB cleanup PASS: no temporary entities, pages, keywords or templates remain.");
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
