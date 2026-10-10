import type { Cluster, EntitySource, KeywordSource, Opportunity, PageSource, RealMetrics } from "./types";

export function realMetrics(value: unknown): RealMetrics {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const number = (key: string, max = Infinity) => typeof source[key] === "number" && Number.isFinite(source[key]) && source[key] >= 0 && source[key] <= max ? source[key] as number : null;
  return { opportunityScore: number("opportunityScore", 100), searchVolume: number("searchVolume"), difficulty: number("difficulty", 100), cpc: number("cpc"), competition: number("competition") };
}
export function deriveOpportunities(keywords: KeywordSource[], entities: EntitySource[], pages: PageSource[]): Opportunity[] {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  return keywords.map((keyword) => ({ ...keyword, metrics: realMetrics(keyword.metrics), entity: byId.get(keyword.entityId ?? "") ?? null,
    pages: pages.filter((page) => page.entityId === keyword.entityId), mapped: byId.has(keyword.entityId ?? "") }))
    .sort((a, b) => (b.metrics.opportunityScore ?? -1) - (a.metrics.opportunityScore ?? -1) || a.keyword.localeCompare(b.keyword));
}
export function deriveClusters(keywords: KeywordSource[], entities: EntitySource[]): Cluster[] {
  const groups = new Map<string, KeywordSource[]>();
  for (const keyword of keywords) if (keyword.clusterKey) groups.set(keyword.clusterKey, [...(groups.get(keyword.clusterKey) ?? []), keyword]);
  const entityIds = new Set(entities.map((entity) => entity.id));
  return [...groups].map(([clusterKey, rows]) => {
    const referenced = new Set(rows.map((row) => row.primaryKeywordId).filter(Boolean));
    const unmappedKeywords = rows.filter((row) => !entityIds.has(row.entityId ?? "")).length;
    return { clusterKey, keywordCount: rows.length,
      primaryKeywords: rows.filter((row) => !row.primaryKeywordId && (row.type === "PRIMARY" || referenced.has(row.id))).map((row) => ({ id: row.id, keyword: row.keyword })),
      entities: entities.filter((entity) => rows.some((row) => row.entityId === entity.id)),
      statuses: [...new Set(rows.map((row) => row.status))].sort(), types: [...new Set(rows.map((row) => row.type))].sort(), intents: [...new Set(rows.map((row) => row.intent))].sort(),
      mapped: unmappedKeywords === 0, unmappedKeywords };
  }).sort((a, b) => a.clusterKey.localeCompare(b.clusterKey));
}
