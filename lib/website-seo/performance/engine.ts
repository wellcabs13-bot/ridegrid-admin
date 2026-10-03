import { WINDOWS, type PerformanceWindow } from "./types";
export { realMetrics } from "../search-intelligence/engine";
export function performanceRange(value = "30D", now = new Date()) {
  if (!WINDOWS.includes(value as PerformanceWindow)) throw new Error("Invalid window; use 7D, 30D or 90D.");
  return { window: value as PerformanceWindow, from: new Date(now.getTime() - parseInt(value) * 86400000), to: now };
}
export function inWindow(date: Date, from: Date, to: Date) { return date >= from && date <= to; }
export function rankSummary(rows: { rank: number | null; observedAt: Date }[]) {
  const valid = rows.filter(r => r.rank !== null && Number.isInteger(r.rank) && r.rank > 0).sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  const latest = valid[0];
  const previous = valid.find(r => latest && r.observedAt < latest.observedAt);
  return { latestRank: latest?.rank ?? null, previousRank: previous?.rank ?? null,
    rankChange: latest && previous ? previous.rank! - latest.rank! : null,
    bestRank: valid.length ? Math.min(...valid.map(r => r.rank!)) : null };
}
export function averageScore(values: (number | null)[]) { const scores = values.filter((v): v is number => v !== null && Number.isFinite(v)); return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export function pageState(metadata: unknown) {
  const m = object(metadata), external = object(object(object(m.indexing).observation).external);
  const observed = typeof external.observedAt === "string" && Number.isFinite(Date.parse(external.observedAt));
  return { coverage: observed && ["INDEXED", "NOT_INDEXED", "DISCOVERED", "CRAWLED", "BLOCKED", "ERROR"].includes(String(external.coverage)) ? String(external.coverage) : "UNKNOWN",
    crawl: observed && ["CRAWLED", "BLOCKED", "ERROR"].includes(String(external.crawl)) ? String(external.crawl) : "UNKNOWN" };
}
