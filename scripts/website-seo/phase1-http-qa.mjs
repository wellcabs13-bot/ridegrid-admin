import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.PHASE1_QA_URL || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('QA targets must be local; this script is not a production load test.');
const pages = JSON.parse(await fs.readFile('data/seo/phase1-page-manifest.json', 'utf8'));
const aliases = JSON.parse(await fs.readFile('data/seo/phase1-aliases.json', 'utf8'));
const rows = [];
let cursor = 0;
async function worker() {
  while (cursor < pages.length) {
    const page = pages[cursor++]; const started = performance.now();
    try {
      const response = await fetch(base + page.canonicalUrl, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
      const html = await response.text();
      const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
      const robots = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/)?.[1];
      const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
      assert.equal(response.status, 200); assert.equal(canonical, 'https://www.wellcabs.com' + page.canonicalUrl);
      assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
      assert.ok(html.includes('<title>') && html.includes('name="description"'));
      assert.ok(html.includes('property="og:title"') && html.includes('property="og:url"'));
      assert.ok(schemas.some(s => s['@graph']?.some(n => n['@type'] === 'BreadcrumbList')));
      assert.ok(!schemas.some(s => JSON.stringify(s).match(/"@type":"(?:Offer|AggregateRating|Review)"/)));
      assert.ok(![...html.matchAll(/<img\b[^>]*>/g)].some(m => !/\balt="[^"]*"/.test(m[0])));
      assert.ok(page.links.every(link => html.includes(`href="${link.href}"`)));
      assert.equal(robots?.includes('noindex'), page.indexState !== 'READY_INDEX');
      assert.ok(schemas.some(s => s['@graph']?.some(n => n['@type'] === 'WebPage')));
      assert.ok(!html.includes('name="keywords"'));
      rows.push({ pageId: page.pageId, path: page.canonicalUrl, status: response.status, canonical, robots, ms: Math.round(performance.now() - started), pass: true });
    } catch (error) { rows.push({ pageId: page.pageId, path: page.canonicalUrl, pass: false, error: String(error) }); }
    if (rows.length % 50 === 0) console.log(`Validated ${rows.length}/408 URLs`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
const redirects = [];
for (const [from, to] of Object.entries(aliases)) {
  const response = await fetch(base + from, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  const destination = new URL(response.headers.get('location') || '/', base).pathname;
  redirects.push({ from, to, status: response.status, pass: response.status === 308 && destination === to });
}
const sitemap = await (await fetch(base + '/sitemap.xml')).text();
for (const page of pages) assert.equal(sitemap.includes(`<loc>https://www.wellcabs.com${page.canonicalUrl}</loc>`), page.indexState === 'READY_INDEX');
for (const alias of Object.keys(aliases)) assert.ok(!sitemap.includes(`<loc>https://www.wellcabs.com${alias}</loc>`));
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(new Set(locations).size, locations.length, 'Duplicate sitemap URL');
const invalid = [];
for (const path of ['/cities/unknown-phase1', '/areas/unknown-phase1', '/routes/unknown-phase1-cab', '/tours/unknown-phase1', '/services/local-car-rental/unknown-phase1', '/vehicles/premium-suv/unknown-phase1', '/airports/unknown-phase1']) {
  const response = await fetch(base + path, { redirect: 'manual' });
  invalid.push({ path, status: response.status, pass: response.status === 404 });
}
const report = { base, checkedAt: new Date().toISOString(), pages: rows, redirects, invalid, failures: rows.filter(r => !r.pass).length + redirects.filter(r => !r.pass).length + invalid.filter(r => !r.pass).length, sitemapMatches: true };
await fs.mkdir('docs/website-seo/phase1-qa', { recursive: true });
await fs.writeFile('docs/website-seo/phase1-qa/http.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pages: rows.length, redirects: redirects.length, failures: report.failures }));
if (report.failures) process.exitCode = 1;
