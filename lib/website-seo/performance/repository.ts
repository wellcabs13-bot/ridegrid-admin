import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { performanceRange, pageState, realMetrics } from "./engine";
import { localAnalyticsProvider } from "./providers";
import type { PerformanceReport, ReportRow } from "./types";

// Aggregate complete histories in PostgreSQL; only bounded summary rows leave the DB.
function searchCte(from: Date, to: Date) {
  return Prisma.sql`WITH observations AS (
    SELECT * FROM "WebsiteSeoSearchObservation" WHERE "observedAt" >= ${from} AND "observedAt" <= ${to}
  ), ranked AS (
    SELECT *, row_number() OVER (PARTITION BY query, "keywordId", "pageId", subject, "competitorId", provider ORDER BY "observedAt" DESC, id DESC) AS rn,
      min(rank) OVER (PARTITION BY query, "keywordId", "pageId", subject, "competitorId", provider) AS best,
      count(*) OVER (PARTITION BY query, "keywordId", "pageId", subject, "competitorId", provider)::int AS total
    FROM observations WHERE kind = 'ORGANIC_RANKING' AND rank > 0
  ), ranks AS (
    SELECT r.query, r."keywordId", r."pageId", r.subject, r."competitorId", r.provider,
      r.rank AS "latestRank", r."observedAt" AS "lastObserved",
      p.rank AS "previousRank", p.rank - r.rank AS "rankChange",
      r.best AS "bestRank", r.total AS "observationCount"
    FROM ranked r LEFT JOIN LATERAL (
      SELECT h.rank FROM ranked h WHERE (h.query,h."keywordId",h."pageId",h.subject,h."competitorId",h.provider) IS NOT DISTINCT FROM (r.query,r."keywordId",r."pageId",r.subject,r."competitorId",r.provider)
        AND h."observedAt" < r."observedAt" ORDER BY h."observedAt" DESC, h.id DESC LIMIT 1
    ) p ON true WHERE r.rn = 1
  )`;
}
const hasIndexObservation = Prisma.sql`p.metadata #>> '{indexing,observation,external,observedAt}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'`;
const coverage = Prisma.sql`CASE WHEN ${hasIndexObservation}
  AND p.metadata #>> '{indexing,observation,external,coverage}' IN ('INDEXED','NOT_INDEXED','DISCOVERED','CRAWLED','BLOCKED','ERROR')
  THEN p.metadata #>> '{indexing,observation,external,coverage}' ELSE 'UNKNOWN' END`;
function metric(key: string) {
  // key is selected only from internal constants, never interpolated as SQL text.
  return Prisma.sql`CASE WHEN jsonb_typeof(k.metrics -> ${key}) = 'number' THEN CASE WHEN (k.metrics ->> ${key})::numeric >= 0
    ${["opportunityScore", "difficulty"].includes(key) ? Prisma.sql`AND (k.metrics ->> ${key})::numeric <= 100` : Prisma.empty}
    THEN (k.metrics ->> ${key})::float8 ELSE NULL END ELSE NULL END`;
}
async function rows(sql: Prisma.Sql): Promise<ReportRow[]> {
  // JSON serialization normalizes PostgreSQL dates/numerics without BigInt responses.
  const result = await prisma.$queryRaw<{ row: ReportRow }[]>(Prisma.sql`SELECT to_jsonb(result) AS row FROM (${sql}) result`);
  return result.map(r => r.row);
}
export async function performanceReport(section: string, params: URLSearchParams): Promise<PerformanceReport> {
  const range = performanceRange(params.get("window") || "30D");
  const report: PerformanceReport = { window: range.window, from: range.from.toISOString(), to: range.to.toISOString(), cards: {}, sections: [] };
  const cte = searchCte(range.from, range.to);
  const search = `%${(params.get("search") || "").slice(0, 200)}%`;
  const filter = (key: string, column: Prisma.Sql) => params.get(key) ? Prisma.sql`AND ${column} = ${params.get(key)}` : Prisma.empty;
  const offsetText = params.get("offset") || "0";
  if (!/^\d+$/.test(offsetText) || Number(offsetText) > 100000) throw new Error("Invalid offset.");
  const offset = Number(offsetText);
  if (section === "conversions") {
    const [traffic, conversions, revenue] = await Promise.all([localAnalyticsProvider.traffic(range.from, range.to), localAnalyticsProvider.conversions(range.from, range.to), localAnalyticsProvider.revenue(range.from, range.to)]);
    report.cards = { Traffic: traffic.status, Conversions: conversions.status, Revenue: revenue.status };
    report.sections = [{ title: "Provider availability", rows: [
      { provider: "Traffic", available: traffic.available, status: traffic.status, ...traffic.metrics },
      { provider: "Conversions", available: conversions.available, status: conversions.status, ...conversions.metrics },
      { provider: "Revenue", available: revenue.available, status: revenue.status, ...revenue.metrics },
    ] }];
    return report;
  }
  if (section === "keywords" || section === "pages") {
    const isKeyword = section === "keywords";
    const base = isKeyword ? Prisma.sql`SELECT k.id, k.keyword, k.intent, k.type, k.status, e.name AS entity, k."entityType", k."clusterKey" AS cluster,
      ${metric("searchVolume")} AS "searchVolume", ${metric("difficulty")} AS difficulty, ${metric("opportunityScore")} AS "opportunityScore",
      ${metric("cpc")} AS cpc, ${metric("competition")} AS competition, r."latestRank", r."previousRank", r."rankChange", r.provider, r.query,
      r."lastObserved", competitor.query AS "competitorQuery", competitor.provider AS "competitorProvider", competitor."latestRank" AS "competitorRank", c.domain AS competitor,
      competitor."lastObserved" AS "competitorObservedAt"
      FROM "WebsiteSeoKeyword" k LEFT JOIN "WebsiteSeoEntity" e ON e.id = k."entityId"
      LEFT JOIN LATERAL (SELECT * FROM ranks WHERE "keywordId" = k.id AND subject = 'OWN_SITE' ORDER BY "lastObserved" DESC, provider, query LIMIT 1) r ON true
      LEFT JOIN LATERAL (SELECT * FROM ranks WHERE "keywordId" = k.id AND subject = 'COMPETITOR' ORDER BY "lastObserved" DESC, provider, query LIMIT 1) competitor ON true
      LEFT JOIN "WebsiteSeoCompetitor" c ON c.id = competitor."competitorId"
      WHERE k.keyword ILIKE ${search} ${filter("intent", Prisma.sql`k.intent::text`)} ${filter("type", Prisma.sql`k.type::text`)} ${filter("status", Prisma.sql`k.status::text`)} ${filter("entityType", Prisma.sql`k."entityType"::text`)}`
      : Prisma.sql`SELECT p.id, p.pathname, e.name AS entity, e.type AS "entityType", p.status, p.status = 'PUBLISHED' AS published,
        p.metadata #>> '{seoW6,plan,canonical,url}' AS canonical, ${coverage} AS coverage,
        CASE WHEN ${hasIndexObservation} AND p.metadata #>> '{indexing,observation,external,crawl}' IN ('CRAWLED','BLOCKED','ERROR') THEN p.metadata #>> '{indexing,observation,external,crawl}' ELSE 'UNKNOWN' END AS crawl,
        CASE WHEN p.status <> 'PUBLISHED' THEN 'NOT ELIGIBLE' WHEN p.metadata #>> '{seoW6,plan,sitemapEligibility,eligible}' = 'true' THEN 'STORED ELIGIBLE' ELSE 'UNKNOWN' END AS sitemap,
        'UNAVAILABLE' AS "liveSitemapInclusion", p."updatedAt", r.query, r.provider, r."latestRank", r."previousRank", r."rankChange",
        (SELECT min(rank) FROM observations WHERE "pageId" = p.id AND kind = 'ORGANIC_RANKING' AND subject = 'OWN_SITE' AND rank > 0) AS "bestRank",
        (SELECT count(*)::int FROM observations WHERE "pageId" = p.id AND kind = 'ORGANIC_RANKING') AS "organicObservations",
        (SELECT max("observedAt") FROM observations WHERE "pageId" = p.id) AS "lastObserved"
      FROM "WebsiteSeoPage" p JOIN "WebsiteSeoEntity" e ON e.id = p."entityId"
      LEFT JOIN LATERAL (SELECT * FROM ranks WHERE "pageId" = p.id AND subject = 'OWN_SITE' ORDER BY "lastObserved" DESC, provider, query LIMIT 1) r ON true
      WHERE p.pathname ILIKE ${search} ${filter("status", Prisma.sql`p.status::text`)} ${filter("entityType", Prisma.sql`e.type::text`)} ${filter("coverage", coverage)}`;
    const sortColumns: Record<string, Prisma.Sql> = { opportunityScore: Prisma.sql`"opportunityScore" DESC`, searchVolume: Prisma.sql`"searchVolume" DESC`, latestRank: Prisma.sql`"latestRank" ASC`, rankChange: Prisma.sql`"rankChange" DESC` };
    const sort = isKeyword ? sortColumns[params.get("sort") || "opportunityScore"] : Prisma.sql`pathname ASC`;
    if (!sort) throw new Error("Invalid sort.");
    const result = await rows(Prisma.sql`${cte}, inventory AS (${base}) SELECT *, count(*) OVER()::int AS "matchingRecords" FROM inventory WHERE true
      ${params.get("ranking") === "observed" ? Prisma.sql`AND "latestRank" IS NOT NULL` : params.get("ranking") === "unobserved" ? Prisma.sql`AND "latestRank" IS NULL` : Prisma.empty}
      ${isKeyword && params.get("opportunity") === "available" ? Prisma.sql`AND "opportunityScore" IS NOT NULL` : isKeyword && params.get("opportunity") === "unavailable" ? Prisma.sql`AND "opportunityScore" IS NULL` : Prisma.empty}
      ORDER BY ${sort} NULLS LAST, id LIMIT 100 OFFSET ${offset}`);
    report.sections = [{ title: isKeyword ? "Keyword performance" : "Page performance", rows: result,
      note: "100 records per page. Latest OWN_SITE series is shown; changes compare the same provider/query/page/keyword/subject. Positive rank change means improvement. Inventory is current; observations use the selected window." }];
    return report;
  }
  const [summary, ranking, ai, competitors] = await Promise.all([
    rows(Prisma.sql`${cte} SELECT count(*) FILTER (WHERE kind = 'ORGANIC_RANKING')::int AS "Ranking Observations", count(*) FILTER (WHERE kind = 'AI_VISIBILITY')::int AS "AI Visibility Observations", max("observedAt") AS "Latest Observation",
      (SELECT count(*)::int FROM ranks WHERE subject = 'OWN_SITE') AS "Observed Own-site Series",
      (SELECT min("latestRank") FROM ranks WHERE subject = 'OWN_SITE') AS "Best Current Own-site Rank",
      (SELECT count(DISTINCT "keywordId")::int FROM ranks WHERE subject = 'OWN_SITE') AS "Keywords With Ranks",
      (SELECT count(DISTINCT query)::int FROM ranks WHERE subject = 'OWN_SITE') AS "Queries With Ranks",
      CASE WHEN count(mentioned) FILTER (WHERE kind = 'AI_VISIBILITY') > 0 THEN count(*) FILTER (WHERE kind = 'AI_VISIBILITY' AND mentioned)::int END AS "AI Mentions",
      CASE WHEN count(cited) FILTER (WHERE kind = 'AI_VISIBILITY') > 0 THEN count(*) FILTER (WHERE kind = 'AI_VISIBILITY' AND cited)::int END AS "AI Citations",
      avg("visibilityScore") FILTER (WHERE kind = 'AI_VISIBILITY') AS "AI Average Score" FROM observations`),
    rows(Prisma.sql`${cte} SELECT * FROM ranks ORDER BY "lastObserved" DESC, query, provider LIMIT 250`),
    rows(Prisma.sql`${cte} SELECT provider, query, subject, "competitorId", count(*)::int AS observations,
      CASE WHEN count(mentioned) > 0 THEN count(*) FILTER (WHERE mentioned)::int END AS mentions,
      CASE WHEN count(cited) > 0 THEN count(*) FILTER (WHERE cited)::int END AS citations,
      avg("visibilityScore") AS "averageScore", count("visibilityScore")::int AS "scoredObservations", max("observedAt") AS "lastObserved"
      FROM observations WHERE kind = 'AI_VISIBILITY' GROUP BY provider, query, subject, "competitorId" ORDER BY max("observedAt") DESC LIMIT 250`),
    rows(Prisma.sql`${cte} SELECT c.name, c.domain, c.status, count(DISTINCT o.query)::int AS "trackedQueries",
      count(o.id) FILTER (WHERE o.kind = 'ORGANIC_RANKING')::int AS "organicObservations", count(o.id) FILTER (WHERE o.kind = 'AI_VISIBILITY')::int AS "aiObservations",
      min(o.rank) FILTER (WHERE o.kind = 'ORGANIC_RANKING' AND o.rank > 0) AS "bestRank", max(o."observedAt") AS "lastObserved",
      (SELECT "latestRank" FROM ranks WHERE "competitorId" = c.id ORDER BY "lastObserved" DESC, provider, query LIMIT 1) AS "latestRank"
      FROM "WebsiteSeoCompetitor" c LEFT JOIN observations o ON o."competitorId" = c.id AND o.subject = 'COMPETITOR'
      GROUP BY c.id ORDER BY max(o."observedAt") DESC NULLS LAST, c.name LIMIT 250`),
  ]);
  report.cards = summary[0];
  report.sections = [{ title: "Search Performance", rows: ranking, note: "Latest 250 series. Positive change = improvement. Comparisons require distinct observation timestamps in this window." },
    { title: "AI Visibility", rows: ai, note: "Actual recorded values only. Null scores, mentions and citations remain unavailable. Latest 250 provider/query/subject groups." },
    { title: "Competitor observations", rows: competitors, note: "Up to 250 competitors. No observations does not establish competitor performance." }];
  if (section === "search") return report;
  // Inventory scans use bounded batches and retain only counters/top opportunities, never page content.
  const counts: ReportRow = { "Website Pages": 0, "Ready Pages": 0, "Published Pages": 0, "Archived Pages": 0, "Indexed Pages": 0, "Not Indexed Pages": 0, "Unknown Indexing": 0, "Other Coverage": 0, "Stored Sitemap Eligible": 0, "Live Sitemap Inclusion": "UNAVAILABLE", "Tracked Keywords": 0, "Active Keywords": 0, "Mapped Keywords": 0, "Opportunity Records": 0, "With Search Volume": 0, "Without Search Volume": 0 };
  const add = (key: string) => { counts[key] = Number(counts[key]) + 1; };
  let cursor: string | undefined;
  for (;;) {
    const batch: { id: string; status: string; metadata: Prisma.JsonValue }[] = await prisma.websiteSeoPage.findMany({ select: { id: true, status: true, metadata: true }, orderBy: { id: "asc" }, take: 250, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!batch.length) break;
    for (const p of batch) { add("Website Pages"); if (p.status === "READY") add("Ready Pages"); if (p.status === "PUBLISHED") add("Published Pages"); if (p.status === "ARCHIVED") add("Archived Pages");
      const state = pageState(p.metadata); add(state.coverage === "INDEXED" ? "Indexed Pages" : state.coverage === "NOT_INDEXED" ? "Not Indexed Pages" : state.coverage === "UNKNOWN" ? "Unknown Indexing" : "Other Coverage");
      const metadata = p.metadata as { seoW6?: { plan?: { sitemapEligibility?: { eligible?: boolean } } } } | null;
      if (p.status === "PUBLISHED" && metadata?.seoW6?.plan?.sitemapEligibility?.eligible === true) add("Stored Sitemap Eligible");
    } cursor = batch[batch.length - 1].id;
  }
  cursor = undefined; const opportunities: ReportRow[] = [];
  for (;;) {
    const batch: { id: string; keyword: string; status: string; entityId: string | null; metrics: Prisma.JsonValue }[] = await prisma.websiteSeoKeyword.findMany({ select: { id: true, keyword: true, status: true, entityId: true, metrics: true }, orderBy: { id: "asc" }, take: 250, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!batch.length) break;
    for (const k of batch) { add("Tracked Keywords"); if (k.status === "ACTIVE") add("Active Keywords"); if (k.entityId) add("Mapped Keywords"); const m = realMetrics(k.metrics);
      add(m.searchVolume === null ? "Without Search Volume" : "With Search Volume"); if (m.opportunityScore !== null) { add("Opportunity Records"); opportunities.push({ keyword: k.keyword, ...m }); opportunities.sort((a, b) => Number(b.opportunityScore) - Number(a.opportunityScore)); opportunities.length = Math.min(10, opportunities.length); }
    } cursor = batch[batch.length - 1].id;
  }
  if (Number(counts["Unknown Indexing"]) === Number(counts["Website Pages"])) counts["Indexed Pages"] = "UNKNOWN";
  report.cards = { ...counts, ...report.cards, Competitors: await prisma.websiteSeoCompetitor.count(), Traffic: "NOT CONNECTED", Conversions: "NOT ATTRIBUTED", Revenue: "NOT ATTRIBUTED" };
  report.sections.unshift({ title: "Keyword Opportunities", rows: opportunities, note: "Top ten actual W4 opportunity scores; current inventory." }, { title: "Page Health", rows: [{ ready: counts["Ready Pages"], published: counts["Published Pages"], archived: counts["Archived Pages"], indexed: counts["Indexed Pages"], notIndexed: counts["Not Indexed Pages"], unknownIndexing: counts["Unknown Indexing"], otherCoverage: counts["Other Coverage"], storedSitemapEligible: counts["Stored Sitemap Eligible"] }], note: "Current stored W7 coverage; UNKNOWN is not a failure. Stored sitemap eligibility is not confirmation of live sitemap inclusion." });
  return report;
}
