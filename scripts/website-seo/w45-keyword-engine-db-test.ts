import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { keywordIntelligenceEngine } from "../../lib/website-seo/keywords/engine";

async function main() {
  const marker = `w45-${randomUUID()}`;
  let entityId: string | undefined;
  try {
    const entity = await prisma.websiteSeoEntity.create({ data: {
      type: "CITY", name: marker, slug: marker, status: "DRAFT", metadata: { source: "W4.5_TEST" },
    } });
    entityId = entity.id;
    const preview = await keywordIntelligenceEngine.generate(entity.id);
    assert.equal(preview.persistence, null);
    assert.equal(await prisma.websiteSeoKeyword.count({ where: { entityId } }), 0);
    const first = await keywordIntelligenceEngine.generate(entity.id, true);
    assert.equal(first.persistence?.created, preview.candidateCount);
    const second = await keywordIntelligenceEngine.generate(entity.id, true);
    assert.equal(second.persistence?.created, 0);
    assert.deepEqual(second.persistence?.records, first.persistence?.records);
    assert.equal(await prisma.websiteSeoKeyword.count({ where: { entityId } }), preview.candidateCount);
    const rows = second.persistence!.records;
    for (const row of rows) {
      if (!row.primaryKeywordId) continue;
      const root = rows.find(item => item.id === row.primaryKeywordId);
      assert.ok(root);
      assert.equal(root.primaryKeywordId, null);
      assert.equal(root.clusterKey, row.clusterKey);
    }
    const human = await prisma.websiteSeoKeyword.update({ where: { id: rows[0].id }, data: {
      status: "ACTIVE", metrics: { searchVolume: 27 }, metadata: { human: true },
    } });
    // A keyword no longer discovered must also survive regeneration.
    const manual = await prisma.websiteSeoKeyword.create({ data: {
      keyword: `manual ${marker}`, normalizedKeyword: `manual ${marker}`, entityId, entityType: "CITY",
      type: "CITY", intent: "LOCAL", status: "APPROVED",
    } });
    await keywordIntelligenceEngine.generate(entity.id, true);
    assert.deepEqual(await prisma.websiteSeoKeyword.findUnique({ where: { id: human.id } }), human);
    assert.deepEqual(await prisma.websiteSeoKeyword.findUnique({ where: { id: manual.id } }), manual);
    // Change this temporary entity only to force simultaneous insertion of new candidates.
    await prisma.websiteSeoEntity.update({ where: { id: entityId }, data: { name: `${marker} revised` } });
    const concurrentPreview = await keywordIntelligenceEngine.generate(entityId);
    const concurrent = await Promise.all([
      keywordIntelligenceEngine.generate(entityId, true), keywordIntelligenceEngine.generate(entityId, true),
    ]);
    assert.equal(concurrent.reduce((n, r) => n + r.persistence!.created, 0), concurrentPreview.candidateCount);
    const all = await prisma.websiteSeoKeyword.findMany({ where: { entityId } });
    assert.equal(new Set(all.map(k => k.normalizedKeyword)).size, all.length);
    console.log("W4.5 real DB: preview, idempotency, relationships, lifecycle preservation, concurrency PASS");
  } finally {
    if (entityId) {
      await prisma.websiteSeoKeyword.deleteMany({ where: { entityId } });
      await prisma.websiteSeoEntity.delete({ where: { id: entityId } });
      assert.equal(await prisma.websiteSeoKeyword.count({ where: { entityId } }), 0);
      assert.equal(await prisma.websiteSeoEntity.count({ where: { id: entityId } }), 0);
      console.log("W4.5 temporary entity and keyword cleanup PASS");
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
