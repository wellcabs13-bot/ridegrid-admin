import { createWebsiteKeywordClusterKey } from "../cluster-key";
import type { WebsiteKeywordIntent } from "../types";

export const compareKeywords = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** Entity + search purpose groups taxi/cab and fare/price variants together. */
export function keywordClusterKey(entityId: string, intent: WebsiteKeywordIntent): string {
  const purpose = intent === "LOCAL" || intent === "TRANSACTIONAL" ? "booking" : intent;
  return `w45:${entityId}:${createWebsiteKeywordClusterKey(purpose)}`;
}

/** Shortest normalized phrase, then code-point order; independent of provider order. */
export function selectPrimaryKeyword(keywords: readonly string[]): string {
  if (!keywords.length) throw new Error("Cannot select a primary from an empty cluster.");
  return [...keywords].sort((a, b) => a.split(" ").length - b.split(" ").length ||
    a.length - b.length || compareKeywords(a, b))[0];
}
