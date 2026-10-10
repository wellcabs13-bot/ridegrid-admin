// @vitest-environment node
import { describe, expect, it } from "vitest";
import { analyzeKeywords } from "../../lib/website-seo/keywords/engine/analyze";
import { classifyKeywordIntent, classifyKeywordType } from "../../lib/website-seo/keywords/classification";
import { mapKeywordPage } from "../../lib/website-seo/keywords/mapping";
import { scoreKeyword } from "../../lib/website-seo/keywords/scoring";
import { WEBSITE_ENTITY_TYPES } from "../../lib/website-seo/entities/types";
import type { KeywordEntity } from "../../lib/website-seo/keywords/discovery";

const entity: KeywordEntity = { id: "test-route", type: "ROUTE", name: "Alpha to Beta",
  metadata: { fromCity: "Alpha", toCity: "Beta" } };

describe("W4.5 keyword intelligence", () => {
  it("normalizes Unicode/case/spacing and deduplicates across providers", () => {
    const result = analyzeKeywords(entity, [], [{ discover: () => [" ＣＡＢ  Alpha ", "cab alpha", "CAB ALPHA", " "] }]);
    expect(result.keywords.map(k => k.normalizedKeyword)).toEqual(["cab alpha"]);
    expect(result.rawCandidateCount).toBe(4);
  });
  it.each([
    ["book cab", "TRANSACTIONAL"], ["hire cab", "TRANSACTIONAL"], ["reserve cab", "TRANSACTIONAL"],
    ["cab fare", "COMMERCIAL"], ["compare taxi prices", "COMMERCIAL"],
    ["how to book cab", "INFORMATIONAL"], ["cab guide", "INFORMATIONAL"],
    ["cab near me", "LOCAL"], ["cab in Alpha", "LOCAL"],
    ["RideGrid official website", "NAVIGATIONAL"], ["RideGrid cab", "TRANSACTIONAL"],
  ])("classifies intent: %s", (text, intent) => expect(classifyKeywordIntent(text)).toBe(intent));
  it.each(WEBSITE_ENTITY_TYPES)("discovers and retains %s entity mapping", type => {
    const result = analyzeKeywords({ ...entity, type });
    expect(result.candidateCount).toBeGreaterThan(0);
    for (const keyword of result.keywords) {
      expect(keyword.entityId).toBe(entity.id);
      expect(keyword.entityType).toBe(type);
      expect(keyword.page).toBeNull();
    }
    expect(classifyKeywordType("Alpha taxi", type)).toBe(type === "AREA" ? "LOCAL" : type);
  });
  it.each([
    ["how to book taxi", "QUESTION"], ["taxi fare", "COMMERCIAL"], ["taxi near me", "LOCAL"],
    ["taxi guide", "INFORMATIONAL"], ["book a taxi from the north side of Alpha", "LONG_TAIL"],
  ])("classifies type: %s", (text, type) => expect(classifyKeywordType(text, "ROUTE")).toBe(type));
  it("is deterministic, with stable shared clusters and acyclic primary references", () => {
    const result = analyzeKeywords(entity);
    expect(analyzeKeywords(entity)).toEqual(result);
    expect(result.clusterCount).toBeLessThan(result.candidateCount);
    const reversed = analyzeKeywords(entity, [], [{ discover: () => result.keywords.map(k => k.keyword).reverse() }]);
    expect(reversed.keywords).toEqual(result.keywords);
    for (const key of new Set(result.keywords.map(k => k.clusterKey))) {
      const group = result.keywords.filter(k => k.clusterKey === key);
      const roots = group.filter(k => k.primaryKeywordKey === null);
      expect(roots).toHaveLength(1);
      expect(roots[0].type).toBe("PRIMARY");
      expect(group.filter(k => k.type === "SECONDARY").every(k => k.primaryKeywordKey === roots[0].keyword)).toBe(true);
    }
    expect(analyzeKeywords({ ...entity, id: "another" }).keywords[0].clusterKey).not.toBe(result.keywords[0].clusterKey);
  });
  it("scores deterministically within bounds without fabricated metrics", () => {
    for (const keyword of analyzeKeywords(entity).keywords) {
      expect(keyword.metrics).toMatchObject({ searchVolume: null, difficulty: null, cpc: null, competition: null });
      expect(keyword.metrics.opportunityScore).toBeGreaterThanOrEqual(0);
      expect(keyword.metrics.opportunityScore).toBeLessThanOrEqual(100);
      expect(keyword.metadata.opportunity.source).toBe("INTERNAL_HEURISTIC_V1");
    }
    expect(scoreKeyword({ keyword: "book cab", intent: "TRANSACTIONAL", primary: true }).score).toBe(86);
    expect(scoreKeyword({ keyword: "x ".repeat(500), intent: "TRANSACTIONAL", primary: true }).score).toBe(100);
  });
  it("does not invent route endpoints or service offerings from absent metadata", () => {
    const words = analyzeKeywords({ id: "r", type: "ROUTE", name: "Coastal route" }).keywords.map(k => k.keyword).join(" ");
    expect(words).toContain("coastal route");
    expect(words).not.toMatch(/one way|airport|alpha|beta/);
  });
  it("maps only real matching unambiguous pages, preferring a sole published page", () => {
    const page = { id: "page", entityId: entity.id, pathname: "/route", status: "READY" };
    expect(analyzeKeywords(entity, [page]).keywords[0].page?.id).toBe("page");
    expect(mapKeywordPage(entity.id, [{ ...page, entityId: "other" }])).toBeNull();
    expect(mapKeywordPage(entity.id, [{ ...page, status: "ARCHIVED" }])).toBeNull();
    expect(mapKeywordPage(entity.id, [page, { ...page, id: "second" }])).toBeNull();
    expect(mapKeywordPage(entity.id, [page, { ...page, id: "published", status: "PUBLISHED" }])?.id).toBe("published");
  });
});
