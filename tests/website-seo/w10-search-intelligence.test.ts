// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeCompetitorDomain, validateCompetitor, validateObservation } from "../../lib/website-seo/search-intelligence/validation";
import { deriveClusters, deriveOpportunities, realMetrics } from "../../lib/website-seo/search-intelligence/engine";
import { localSearchIntelligenceProvider } from "../../lib/website-seo/search-intelligence/providers";
import type { KeywordSource } from "../../lib/website-seo/search-intelligence/types";

// In-memory fixtures only; this test never writes production records.
const observation = { kind: "ORGANIC_RANKING", subject: "OWN_SITE", provider: "admin-reported", query: "observed query", observedAt: "2025-01-15T12:00:00Z" };
const keyword: KeywordSource = { id: "test-primary", keyword: "test keyword", type: "PRIMARY", intent: "LOCAL", status: "DISCOVERED", entityId: "test-city", entityType: "CITY", clusterKey: "test-cluster", primaryKeywordId: null, metrics: null };

describe("W10 Search Intelligence", () => {
  it("normalizes protocol, path, case and www to a unique domain", () => {
    expect(normalizeCompetitorDomain(" HTTPS://WWW.Example.COM/path?q=1 ")).toBe("example.com");
    expect(normalizeCompetitorDomain("example.com")).toBe("example.com");
    expect(normalizeCompetitorDomain("sub.example.com.")).toBe("sub.example.com");
  });
  it.each(["", "localhost", "https://bad_host.com", "-bad.com", "https://user:pass@example.com", "ftp://example.com", "127.0.0.1", "example..com", "bad domain.com", "example.com:8080"])("rejects invalid competitor domain %s", (domain) => expect(() => normalizeCompetitorDomain(domain)).toThrow());
  it("validates competitor status and rejects arbitrary mutation", () => {
    expect(validateCompetitor({ name: "A company", domain: "example.com" }).status).toBe("ACTIVE");
    expect(validateCompetitor({ status: "ARCHIVED" }, true)).toEqual({ status: "ARCHIVED" });
    expect(() => validateCompetitor({ status: "DELETED" }, true)).toThrow();
    expect(() => validateCompetitor({ status: null }, true)).toThrow();
    expect(() => validateCompetitor({ id: "x" }, true)).toThrow();
  });
  it.each([0, -1, 1.5, "1", NaN, Infinity, 2147483648])("rejects invalid rank %s", (rank) => expect(() => validateObservation({ ...observation, rank })).toThrow());
  it("accepts positive ranks and preserves missing rank as null", () => {
    expect(validateObservation({ ...observation, rank: 1 }).rank).toBe(1);
    expect(validateObservation(observation).rank).toBeNull();
  });
  it.each([-1, 101, NaN, Infinity, "50"])("rejects invalid visibility score %s", (visibilityScore) => expect(() => validateObservation({ ...observation, kind: "AI_VISIBILITY", visibilityScore })).toThrow());
  it("preserves genuine zero, false and unknown AI values distinctly", () => {
    const result = validateObservation({ ...observation, kind: "AI_VISIBILITY", visibilityScore: 0, mentioned: false });
    expect(result.visibilityScore).toBe(0); expect(result.mentioned).toBe(false); expect(result.cited).toBeNull();
    expect(validateObservation({ ...observation, kind: "AI_VISIBILITY", visibilityScore: 100 }).visibilityScore).toBe(100);
  });
  it("enforces competitor and kind-specific field rules", () => {
    expect(() => validateObservation({ ...observation, subject: "COMPETITOR" })).toThrow();
    expect(validateObservation({ ...observation, subject: "COMPETITOR", competitorId: "test-competitor" }).competitorId).toBe("test-competitor");
    expect(() => validateObservation({ ...observation, competitorId: "test-competitor" })).toThrow();
    expect(() => validateObservation({ ...observation, mentioned: true })).toThrow();
    expect(() => validateObservation({ ...observation, kind: "AI_VISIBILITY", rank: 5 })).toThrow();
  });
  it("requires source, query and observed time; rejects unsafe evidence and arbitrary metadata", () => {
    for (const patch of [{ query: " " }, { provider: "" }, { observedAt: "yesterday" }, { observedAt: "2025-01-01T10:00:00" }, { url: "javascript:alert(1)" }, { metadata: { overwrite: true } }, { metadata: { evidenceUrl: "file:///c:/private" } }, { mentioned: "false" }]) expect(() => validateObservation({ ...observation, ...patch })).toThrow();
    expect(validateObservation(observation).metadata.sourceType).toBe("MANUAL");
    expect(validateObservation({ ...observation, metadata: { sourceType: "PROVIDER", notes: "Supplied evidence" } }).metadata.sourceType).toBe("PROVIDER");
  });
  it("does not invent missing W4 metrics or coerce strings", () => {
    expect(realMetrics(null)).toEqual({ opportunityScore: null, searchVolume: null, difficulty: null, cpc: null, competition: null });
    expect(realMetrics({ searchVolume: "100", opportunityScore: NaN }).searchVolume).toBeNull();
    expect(realMetrics({ searchVolume: 0 }).searchVolume).toBe(0);
    const result = deriveOpportunities([keyword, { ...keyword, id: "scored", metrics: { opportunityScore: 20 } }], [], []);
    expect(result[0].id).toBe("scored"); expect(result[1].metrics.opportunityScore).toBeNull(); expect(result[1].mapped).toBe(false);
  });
  it("rejects normalized invalid calendar dates and future observations", () => {
    for (const observedAt of ["2025-02-30T12:00:00Z", "2025-01-01T24:00:00Z", "2099-01-01T12:00:00Z"]) expect(() => validateObservation({ ...observation, observedAt })).toThrow();
    expect(validateObservation({ ...observation, observedAt: "2024-02-29T12:00:00+05:30" }).observedAt.toISOString()).toBe("2024-02-29T06:30:00.000Z");
  });
  it("derives W4 clusters, primary relationships and actual entity mappings", () => {
    const rows = [keyword, { ...keyword, id: "test-secondary", keyword: "secondary", type: "SECONDARY" as const, primaryKeywordId: keyword.id, entityId: null }, { ...keyword, id: "unclustered", clusterKey: null }];
    const result = deriveClusters(rows, [{ id: "test-city", type: "CITY", name: "Test city" }]);
    expect(result).toHaveLength(1); expect(result[0].keywordCount).toBe(2);
    expect(result[0].primaryKeywords).toEqual([{ id: keyword.id, keyword: keyword.keyword }]);
    expect(result[0].unmappedKeywords).toBe(1); expect(result[0].mapped).toBe(false);
    expect(deriveClusters([{ ...keyword, type: "SECONDARY", primaryKeywordId: "missing" }], []).at(0)?.primaryKeywords).toEqual([]);
  });
  it.each(["ORGANIC_RANKING", "AI_VISIBILITY"] as const)("default provider returns no invented %s observations", async (kind) => {
    const result = await localSearchIntelligenceProvider.lookup(kind, { query: "real query", subject: "OWN_SITE" });
    expect(result.state).toBe("UNAVAILABLE"); expect(result.observations).toEqual([]);
  });
});
