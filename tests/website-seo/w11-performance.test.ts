// @vitest-environment node
import { describe, expect, it } from "vitest";
import { averageScore, inWindow, pageState, performanceRange, rankSummary, realMetrics } from "../../lib/website-seo/performance/engine";
import { localAnalyticsProvider } from "../../lib/website-seo/performance/providers";
const now = new Date("2026-09-12T12:00:00Z");
describe("W11 Performance", () => {
  it("preserves missing metrics and real zero values", () => { expect(realMetrics(null).searchVolume).toBeNull(); expect(realMetrics({ searchVolume: 0 }).searchVolume).toBe(0); });
  it("does not fabricate traffic", async () => { const r = await localAnalyticsProvider.traffic(now, now); expect(r.available).toBe(false); expect(r.status).toBe("NOT CONNECTED"); expect(Object.values(r.metrics).every(v => v === null)).toBe(true); });
  it("does not fabricate conversions or revenue", async () => { for (const method of [localAnalyticsProvider.conversions, localAnalyticsProvider.revenue]) { const r = await method(now, now); expect(r.available).toBe(false); expect(r.status).toBe("NOT ATTRIBUTED"); expect(Object.values(r.metrics).every(v => v === null)).toBe(true); } });
  it("uses latest and previous actual ranks with positive improvement", () => { expect(rankSummary([{ rank: 9, observedAt: new Date("2026-09-10") }, { rank: 4, observedAt: now }])).toEqual({ latestRank: 4, previousRank: 9, rankChange: 5, bestRank: 4 }); });
  it("keeps missing previous rank unavailable", () => { expect(rankSummary([{ rank: 3, observedAt: now }]).rankChange).toBeNull(); expect(rankSummary([]).latestRank).toBeNull(); });
  it("requires distinct timestamps for comparisons and ignores invalid ranks", () => { expect(rankSummary([{ rank: 3, observedAt: now }, { rank: 9, observedAt: now }, { rank: 0, observedAt: now }]).previousRank).toBeNull(); });
  it("preserves AI null score", () => { expect(averageScore([null])).toBeNull(); expect(averageScore([null, 0, 10])).toBe(5); });
  it.each(["7D", "30D", "90D"])("filters %s by actual timestamps including boundaries", value => { const r = performanceRange(value, now); expect(inWindow(r.from, r.from, r.to)).toBe(true); expect(inWindow(new Date(r.from.getTime() - 1), r.from, r.to)).toBe(false); expect(inWindow(new Date(now.getTime() + 1), r.from, r.to)).toBe(false); });
  it("rejects invalid windows", () => expect(() => performanceRange("1D")).toThrow());
  it("keeps unobserved indexing UNKNOWN", () => { expect(pageState(null).coverage).toBe("UNKNOWN"); expect(pageState({ indexing: { observation: { external: { coverage: "INDEXED", observedAt: null } } } }).coverage).toBe("UNKNOWN"); expect(pageState({ indexing: { observation: { external: { coverage: "INDEXED", observedAt: now.toISOString() } } } }).coverage).toBe("INDEXED"); });
});
