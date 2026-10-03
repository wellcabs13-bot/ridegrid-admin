import type { WebsiteKeywordIntent } from "../types";

const intentWeight: Record<WebsiteKeywordIntent, number> = {
  TRANSACTIONAL: 35, COMMERCIAL: 30, LOCAL: 30, INFORMATIONAL: 15, NAVIGATIONAL: 10,
};

/** Internal heuristic v1, NOT a search-volume estimate. No external metrics inferred. */
export function scoreKeyword(input: { intent: WebsiteKeywordIntent; keyword: string; primary: boolean }) {
  const signals = {
    intentStrength: intentWeight[input.intent],
    entityRelevance: 25, // Candidates supplied for this entity by the discovery provider.
    specificity: Math.min(20, input.keyword.trim().split(/\s+/).length * 3),
    commercialRelevance: ["TRANSACTIONAL", "COMMERCIAL"].includes(input.intent) ? 10 : 0,
    clusterImportance: input.primary ? 10 : 5,
  };
  return {
    source: "INTERNAL_HEURISTIC_V1" as const,
    score: Math.max(0, Math.min(100, Object.values(signals).reduce((sum, n) => sum + n, 0))),
    signals,
  };
}
