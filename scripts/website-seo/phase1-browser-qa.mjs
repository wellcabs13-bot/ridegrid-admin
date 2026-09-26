import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.PHASE1_QA_URL || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local QA only.');
const pages = JSON.parse(await fs.readFile('data/seo/phase1-page-manifest.json', 'utf8'));
const selectors = [
  '/cities/pune', '/cities/mumbai', 'kharadi', { type: 'area', city: 'Mumbai' }, '/services/local-car-rental/pune', '/services/one-way-cab/pune', '/airports/pune-airport', '/airports/navi-mumbai-international-airport', '/vehicles/premium-suv/pune', '/vehicles/luxury-cars/pune',
  '/routes/pune-to-mumbai-cab', '/routes/pune-to-shirdi-cab', '/routes/pune-to-mahabaleshwar-cab', '/routes/mumbai-to-pune-cab', '/routes/nashik-to-shirdi-cab', '/routes/aurangabad-to-shirdi-cab', '/routes/nagpur-to-wardha-cab', '/routes/solapur-to-tuljapur-cab', '/routes/kolhapur-to-pune-cab', 'ashtavinayak', 'panch-jyotirlinga', 'ajanta-ellora-grishneshwar',
];
const representatives = selectors.map(s => pages.find(p => typeof s === 'string' ? s.startsWith('/') ? p.canonicalUrl === s : p.slug.includes(s) : p.pageType === s.type && p.city === s.city));
if (representatives.some(p => !p)) throw new Error('A representative is missing from the authoritative manifest.');
await fs.mkdir('docs/website-seo/phase1-qa/screenshots', { recursive: true });
const browser = await chromium.launch({ headless: true });
const rows = [];
const marketplaceOnly = process.argv.includes('--marketplace-only');
const saveBrowser = () => fs.writeFile('docs/website-seo/phase1-qa/browser.json', JSON.stringify({ measuredAt: new Date().toISOString(), environment: 'Local production server, headless Chromium, unthrottled desktop CPU/network; LCP/CLS are lab observations, not field Web Vitals. Interaction durations are FAQ-click proxies, not field INP.', rows, failures: rows.filter(r => !r.pass).length }, null, 2) + '\n');
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__phase1Metrics = { lcp: null, cls: 0, longTasks: [], interactions: [] };
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__phase1Metrics.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__phase1Metrics.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { window.__phase1Metrics.longTasks.push(...list.getEntries().map(e => e.duration)); }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(list => { window.__phase1Metrics.interactions.push(...list.getEntries().filter(e => e.interactionId).map(e => e.duration)); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of marketplaceOnly ? [] : [320, 390, 768, 1440]) for (const record of representatives) {
    errors.length = 0;
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(base + record.canonicalUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);
    const info = await page.evaluate(() => ({
      width: innerWidth, documentWidth: document.documentElement.scrollWidth, h1s: document.querySelectorAll('h1').length,
      brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src),
      invalidLinks: [...document.querySelectorAll('main a')].filter(a => !a.getAttribute('href')).length,
      metrics: window.__phase1Metrics,
      transferredBytes: performance.getEntriesByType('resource').reduce((total, entry) => total + entry.transferSize, 0),
      searchY: document.querySelector('#ride-search')?.getBoundingClientRect().top ?? null,
      footerPresent: !!document.querySelector('footer'),
    }));
    if (width === 390 || (width === 1440 && ['city', 'area', 'service', 'airport', 'vehicle', 'route', 'tour'].some(t => t === record.pageType && representatives.find(p => p.pageType === t) === record))) {
      await page.screenshot({ path: `docs/website-seo/phase1-qa/screenshots/${record.pageId}-${width}.png`, fullPage: false });
    }
    if (width === 390 && representatives.find(p => p.pageType === record.pageType) === record) {
      const search = page.locator('#ride-search');
      if (await search.count()) { await search.scrollIntoViewIfNeeded(); await page.screenshot({ path: `docs/website-seo/phase1-qa/screenshots/${record.pageId}-search-390.png` }); }
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/website-seo/phase1-qa/screenshots/${record.pageId}-footer-390.png` });
    }
    // Open one real FAQ to exercise interaction; this is a lab proxy, not field INP.
    const faq = page.locator('main details summary').first();
    if (await faq.count()) { await faq.click(); await page.waitForTimeout(100); }
    const interactionDurations = await page.evaluate(() => window.__phase1Metrics.interactions);
    rows.push({ pageId: record.pageId, family: record.pageType, path: record.canonicalUrl, viewport: width, status: response.status(), ...info, interactionDurations, errors: [...errors], pass: response.status() === 200 && info.documentWidth <= width && info.h1s === 1 && !info.brokenImages.length && !errors.length });
    console.log(`${record.pageId} at ${width}: ${rows.at(-1).pass ? 'PASS' : 'FAIL'}`);
  }
  // Other required widths: one shared template / search example.
  for (const width of marketplaceOnly ? [] : [360, 375, 414, 1024]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(base + '/routes/pune-to-mumbai-cab', { waitUntil: 'networkidle' });
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    rows.push({ path: '/routes/pune-to-mumbai-cab', viewport: width, documentWidth, pass: documentWidth <= width });
  }
  if (!marketplaceOnly) await saveBrowser();
  const marketplace = [];
  for (const path of ['/routes/pune-to-mumbai-cab', '/services/local-car-rental/pune', '/services/one-way-cab/pune', '/services/round-trip-cab/pune', '/routes/pune-to-shirdi-cab']) {
    console.log(`Marketplace: ${path}`);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    // Hydration may start the options request after the initial network-idle gap.
    await page.locator('#ride-search form').waitFor({ state: 'visible' });
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const destination = page.locator('#ride-search label').filter({ hasText: /^Destination/ }).locator('select');
    if (await destination.count() && !await destination.inputValue()) {
      const value = await destination.locator('option').evaluateAll(options => options.find(o => o.value.toLowerCase() === 'mumbai')?.value);
      if (!value) throw new Error(`Mumbai destination missing on ${path}`);
      await destination.selectOption(value);
    }
    await page.getByLabel('Pickup date', { exact: true }).fill(date);
    await page.getByLabel('Pickup time', { exact: true }).fill('12:00');
    const endDate = page.getByLabel('Return date', { exact: true });
    if (await endDate.count()) await endDate.fill(date);
    const invalid = await page.locator('form').evaluate(form => [...form.querySelectorAll('input,select')].filter(e => !e.checkValidity()).map(e => ({ field: e.parentElement.textContent, value: e.value })));
    if (invalid.length) throw new Error(`Invalid form on ${path}: ${JSON.stringify(invalid)}`);
    const responsePromise = page.waitForResponse(r => r.url().includes('/api/marketplace/search?'), { timeout: 60000 });
    await page.getByRole('button', { name: 'Search rides', exact: true }).click();
    const response = await responsePromise;
    const result = await response.json();
    const listings = result.data?.listings;
    const empty = Array.isArray(listings) && listings.length === 0;
    if (empty) await page.getByText('No cabs available for this trip right now', { exact: true }).waitFor();
    const hasModify = empty ? await page.getByRole('button', { name: 'Modify trip or date' }).isVisible() : true;
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    if (path.endsWith('shirdi-cab')) await page.screenshot({ path: 'docs/website-seo/phase1-qa/screenshots/empty-marketplace-390.png', fullPage: true });
    marketplace.push({ path, status: response.status(), empty, hasModify, noOverflow, pass: response.status() === 200 && result.success === true && Array.isArray(listings) && hasModify && noOverflow });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    marketplace.at(-1).landingIntact = await page.locator('h1').count() === 1 && await page.locator('meta[name="robots"]').getAttribute('content') === 'index, follow';
    marketplace.at(-1).pass &&= marketplace.at(-1).landingIntact;
    console.log(JSON.stringify(marketplace.at(-1)));
    await fs.writeFile('docs/website-seo/phase1-qa/marketplace.json', JSON.stringify({ checkedAt: new Date().toISOString(), marketplace }, null, 2) + '\n');
  }
  await fs.writeFile('docs/website-seo/phase1-qa/marketplace.json', JSON.stringify({ checkedAt: new Date().toISOString(), marketplace }, null, 2) + '\n');
  if (marketplace.some(r => !r.pass)) process.exitCode = 1;
  if (!marketplaceOnly) await saveBrowser();
  if (rows.some(r => !r.pass)) process.exitCode = 1;
} finally { await browser.close(); }
