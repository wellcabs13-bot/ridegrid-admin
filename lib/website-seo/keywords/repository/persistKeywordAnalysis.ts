import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { KeywordAnalysis } from "../engine/analyze";

/** Insert missing candidates atomically. Existing records remain human-owned, including metrics and links. */
export async function persistKeywordAnalysis(analysis: KeywordAnalysis) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const entity = await tx.websiteSeoEntity.findUnique({ where: { id: analysis.entity.id } });
        if (!entity || entity.type !== analysis.entity.type) throw new Error("Website entity no longer matches analysis.");
        const existing = await tx.websiteSeoKeyword.findMany({ where: { entityId: entity.id } });
        const known = new Set(existing.map(row => row.normalizedKeyword));
        const missing = analysis.keywords.filter(item => !known.has(item.normalizedKeyword));
        await tx.websiteSeoKeyword.createMany({ data: missing.map(item => ({
          keyword: item.keyword, normalizedKeyword: item.normalizedKeyword,
          entityId: entity.id, entityType: entity.type, type: item.type, intent: item.intent,
          status: item.status, clusterKey: item.clusterKey, metrics: item.metrics, metadata: item.metadata,
        })) });
        const rows = await tx.websiteSeoKeyword.findMany({ where: { entityId: entity.id } });
        const byKey = new Map(rows.map(row => [row.normalizedKeyword, row]));
        let unresolvedRelationships = 0;
        for (const item of missing) {
          if (!item.primaryKeywordKey) continue;
          const primary = byKey.get(item.primaryKeywordKey);
          const child = byKey.get(item.normalizedKeyword)!;
          // Never attach to an existing secondary, rejected record, or a different human cluster.
          if (!primary || primary.primaryKeywordId || primary.clusterKey !== item.clusterKey ||
            ["REJECTED", "ARCHIVED"].includes(primary.status)) {
            unresolvedRelationships++;
            continue;
          }
          await tx.websiteSeoKeyword.update({ where: { id: child.id }, data: { primaryKeywordId: primary.id } });
        }
        const records = await tx.websiteSeoKeyword.findMany({ where: {
          entityId: entity.id, normalizedKeyword: { in: analysis.keywords.map(item => item.normalizedKeyword) },
        }, orderBy: { normalizedKeyword: "asc" } });
        return { created: missing.length, preserved: analysis.keywords.length - missing.length,
          unresolvedRelationships, records };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    } catch (error) {
      // Concurrent generation may conflict at either serialization or the unique constraint.
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
}
