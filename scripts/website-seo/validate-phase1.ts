import fs from "node:fs";
import assert from "node:assert/strict";
import manifest from "../../data/seo/phase1-page-manifest.json";
import keywords from "../../data/seo/phase1-keyword-map.json";
import images from "../../data/seo/phase1-image-manifest.json";
import type { Phase1Page } from "../../lib/website-seo/page-factory/phase1-types";
const pages = manifest as Phase1Page[];
const expected = { city: 7, area: 105, service: 28, airport: 3, vehicle: 35, route: 210, tour: 20 };
assert.equal(pages.length, 408);
for (const [family, count] of Object.entries(expected)) assert.equal(pages.filter(p => p.pageType === family).length, count, family);
for (const key of ["pageId", "canonicalUrl", "primaryKeyword", "title", "h1", "description"] as const) assert.equal(new Set(pages.map(p => p[key].toLowerCase())).size, 408, `Duplicate ${key}`);
const incoming = new Map(pages.map(p => [p.canonicalUrl, 0]));
const broken: string[] = [];
for (const p of pages) {
  assert.equal(keywords.find(k => k.pageId === p.pageId)?.canonicalUrl, p.canonicalUrl);
  assert.equal(p.canonicalUrl, `/${{ city: "cities", area: "areas", service: "services", airport: "airports", vehicle: "vehicles", route: "routes", tour: "tours" }[p.pageType]}/${p.slug}`);
  for (const key of ["title", "h1", "description", "primaryKeyword", "indexState", "mediaState", "schemaState"] as const) assert.ok(p[key], `${p.pageId}: ${key}`);
  const rendered = [p.h1, p.description, p.intro, ...p.editorial.flatMap(s => [s.heading, ...s.paragraphs]), ...p.faqs.flatMap(f => [f.question, f.answer])].join(" ");
  assert.ok(!/\b(?:TODO|Lorem ipsum|Coming soon|undefined|null)\b|\[(?:city|destination)\]|(?:₹|INR)\s*(?:999|XXX)/i.test(rendered), `Placeholder ${p.pageId}`);
  assert.ok(p.links.length > 0);
  assert.ok(images.some(i => i.pageId === p.pageId));
  for (const link of p.links) {
    if (!incoming.has(link.href)) broken.push(`${p.pageId}: ${link.href}`);
    else incoming.set(link.href, incoming.get(link.href)! + 1);
  }
  assert.equal(p.capabilityState, p.bookingSupported ? "BOOKING_CAPABLE" : "CAPABILITY_LIMITED");
  assert.ok(["LIVE_SUPPLY_AVAILABLE", "LIVE_SUPPLY_EMPTY", "PRICING_NOT_CONFIGURED", "NOT_CHECKED"].includes(p.supplyState));
  for (const key of ["secondaryKeywords", "transactionalKeywords", "longTailKeywords", "questionKeywords", "excludedKeywords"] as const) assert.deepEqual(p[key], keywords.find(k => k.pageId === p.pageId)![key]);
}
assert.deepEqual(broken, []);
// Homepage explicitly links these seven roots; follow the rendered graph.
const distances = new Map(pages.filter(p => p.pageType === "city").map(p => [p.canonicalUrl, 1]));
const queue = [...distances.keys()];
for (let i = 0; i < queue.length; i++) {
  const p = pages.find(p => p.canonicalUrl === queue[i])!;
  for (const link of p.links) if (!distances.has(link.href)) { distances.set(link.href, distances.get(p.canonicalUrl)! + 1); queue.push(link.href); }
}
assert.equal(distances.size, 408, "Unreachable page");
const aliases: Record<string, string> = {};
const variants = { aurangabad: ["chhatrapati-sambhajinagar", "sambhajinagar"], nashik: ["nasik"], dharashiv: ["osmanabad"], kalaburagi: ["gulbarga"], vijayapura: ["bijapur"], belagavi: ["belgaum"], bengaluru: ["bangalore"] };
for (const p of pages) for (const [preferred, alternatives] of Object.entries(variants)) {
  const names = [preferred, ...alternatives];
  for (const name of names) {
    const matcher = new RegExp(`(^|[/\\-])${name}(?=$|[/\\-])`, "g");
    if (!matcher.test(p.canonicalUrl)) continue;
    for (const alias of names.filter(n => n !== name)) {
      const path = p.canonicalUrl.replace(new RegExp(`(^|[/\\-])${name}(?=$|[/\\-])`, "g"), `$1${alias}`);
      assert.ok(!incoming.has(path), `Alias conflicts with canonical: ${path}`);
      assert.ok(!aliases[path] || aliases[path] === p.canonicalUrl, `Conflicting alias ${path}`);
      aliases[path] = p.canonicalUrl;
    }
  }
}
// Shingle comparison ignores shared booking/product UI; mask entity names to detect name-swapping.
const names = [...new Set(pages.flatMap(p => [p.city, p.entity, p.search.destination || ""]))].filter(Boolean).sort((a, b) => b.length - a.length);
const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const mask = new RegExp(escaped.join("|"), "gi");
const shingles = pages.map(p => {
  const words = [p.intro, ...p.editorial.flatMap(s => s.paragraphs)].join(" ").replace(mask, "ENTITY").toLowerCase().match(/[a-z]+/g) || [];
  return new Set(words.slice(0, -4).map((_, i) => words.slice(i, i + 5).join(" ")));
});
const similar: { a: string; b: string; similarity: number }[] = [];
const overlap: { a: string; b: string; shared: string[] }[] = [];
for (let a = 0; a < pages.length; a++) for (let b = a + 1; b < pages.length; b++) {
  if (pages[a].pageType === pages[b].pageType) {
    let common = 0; for (const token of shingles[a]) if (shingles[b].has(token)) common++;
    const score = common / Math.max(1, shingles[a].size + shingles[b].size - common);
    if (score >= .8) similar.push({ a: pages[a].pageId, b: pages[b].pageId, similarity: Math.round(score * 1000) / 1000 });
  }
  const ka = keywords[a], kb = keywords[b];
  const set = new Set([ka.primaryKeyword, ...ka.secondaryKeywords].map(k => k.toLowerCase()));
  const shared = [kb.primaryKeyword, ...kb.secondaryKeywords].filter(k => set.has(k.toLowerCase()));
  if (shared.length >= 3) overlap.push({ a: ka.pageId, b: kb.pageId, shared });
}
const flagged = new Set(similar.flatMap(p => [p.a, p.b]));
for (const page of pages) assert.ok(page.indexState !== "READY_INDEX" || !flagged.has(page.pageId), `Similar editorial must not be indexed: ${page.pageId}`);
const report = { total: 408, counts: expected, duplicateOwnershipConflicts: 0, keywordOverlap: overlap, similarity: { method: "Entity-masked 5-word editorial Jaccard, threshold 0.80; shared product components excluded", flaggedPages: flagged.size, pairs: similar },
  orphanPages: pages.filter(p => !incoming.get(p.canonicalUrl) && p.pageType !== "city").map(p => p.pageId), brokenLinks: broken, maximumCrawlDepth: Math.max(...distances.values()), aliases: Object.keys(aliases).length,
  states: Object.fromEntries(["READY_INDEX", "NOINDEX_NEEDS_WORK"].map(state => [state, pages.filter(p => p.indexState === state).length])),
  capabilityStates: Object.fromEntries(["BOOKING_CAPABLE", "CAPABILITY_LIMITED"].map(state => [state, pages.filter(p => p.capabilityState === state).length])),
  supplyStates: Object.fromEntries(["LIVE_SUPPLY_AVAILABLE", "LIVE_SUPPLY_EMPTY", "PRICING_NOT_CONFIGURED", "NOT_CHECKED"].map(state => [state, pages.filter(p => p.supplyState === state).length])),
  pages: pages.map(p => ({ pageId: p.pageId, canonical: p.canonicalUrl, indexState: p.indexState, capabilityState: p.capabilityState, supplyState: p.supplyState, imageState: images.find(i => i.pageId === p.pageId)!.status, structuredDataState: p.schemaState, contentSimilarityFlagged: flagged.has(p.pageId), incomingLinks: incoming.get(p.canonicalUrl), crawlDepth: distances.get(p.canonicalUrl), reasons: p.reasons })) };
fs.writeFileSync("data/seo/phase1-content-quality.json", JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync("data/seo/phase1-aliases.json", JSON.stringify(aliases, null, 2) + "\n");
console.log(JSON.stringify({ total: report.total, states: report.states, flaggedPages: flagged.size, similarPairs: similar.length, keywordOverlap: overlap.length, orphanPages: report.orphanPages.length, maximumCrawlDepth: report.maximumCrawlDepth, aliases: report.aliases }));
