/* Read-only browser audit against a running local site. No bookings or DB writes. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.PUBLIC_CHECK_URL || 'http://localhost:3000';
const output = path.resolve('test-results/website-public');

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  const report = { base, pages: [], missingPublishedTypes: [], errors: [] };
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  try {
    const sitemap = await context.request.get(`${base}/sitemap.xml`);
    const xml = await sitemap.text();
    let locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
    if (xml.includes('<sitemapindex')) {
      const documents = await Promise.all(locations.map(async location => {
        const url = new URL(location);
        return (await context.request.get(`${base}${url.pathname}${url.search}`)).text();
      }));
      locations = documents.flatMap(document => [...document.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]));
    }
    const routes = ['/', '/contact', '/about', '/marketplace', '/marketplace/results'];
    for (const type of ['cities', 'routes', 'airports', 'services']) {
      const location = locations.find(location => new URL(location).pathname.startsWith(`/${type}/`));
      if (location) routes.push(new URL(location).pathname);
      else report.missingPublishedTypes.push(type);
    }
    for (const route of routes) {
      for (const width of (route === '/' || route === '/contact' ? [360, 390, 768, 1440] : [390, 1440])) {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 90000 });
        await page.locator('h1').first().waitFor();
        const metrics = await page.evaluate(() => ({
          viewport: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          h1Count: document.querySelectorAll('h1').length,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          title: document.title,
          brokenImages: [...document.images].filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src')),
        }));
        const entry = { route, width, status: response.status(), ...metrics };
        report.pages.push(entry);
        if (entry.status !== 200 || metrics.scrollWidth > width + 1 || metrics.h1Count !== 1 || metrics.brokenImages.length) {
          report.errors.push(`Page validation failed: ${JSON.stringify(entry)}`);
        }
        if (width === 390 && (route === '/' || route === '/contact')) {
          const menu = page.locator('header details');
          await menu.locator('summary').click();
          if (!(await menu.getAttribute('open') === '')) report.errors.push(`Mobile menu failed: ${route}`);
          await page.keyboard.press('Escape');
          if (await menu.getAttribute('open') !== null) report.errors.push(`Escape failed: ${route}`);
          const floatVisible = await page.getByRole('link', { name: /Chat with Wellcabs on WhatsApp/ }).isVisible();
          if (floatVisible) report.errors.push(`Floating control overlaps mobile layout: ${route}`);
        }
        if (route === '/contact') {
          const whatsapp = page.getByRole('link', { name: /WhatsApp Wellcabs on/ });
          if (!(await whatsapp.getAttribute('href')).startsWith('https://wa.me/919011079304?')) report.errors.push('Incorrect WhatsApp target');
        }
        await page.screenshot({ path: path.join(output, `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}.png`), fullPage: true });
        console.log(`${entry.status} ${width}px ${route} overflow=${metrics.scrollWidth > width}`);
      }
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    const pickup = page.getByLabel('Pickup city', { exact: false });
    if (await pickup.count()) {
      const firstPickup = await pickup.locator('option').nth(1).getAttribute('value');
      const pickupText = await pickup.locator('option').nth(1).textContent();
      await pickup.selectOption(firstPickup || pickupText);
      const destination = page.getByLabel(/Destination/);
      const destinationText = await destination.locator('option').nth(1).textContent();
      await destination.selectOption(destinationText);
      const future = new Date(); future.setDate(future.getDate() + 7);
      await page.getByLabel('Pickup date').fill(future.toISOString().slice(0, 10));
      await page.getByLabel('Pickup time').fill('10:00');
      await page.getByRole('button', { name: 'Search rides', exact: true }).click();
      await page.waitForURL('**/marketplace/results?**', { timeout: 30000 });
      await page.waitForLoadState('networkidle');
      await page.getByText('Finding your best vehicles', { exact: true }).waitFor({ state: 'hidden', timeout: 60000 });
      report.liveSearch = { url: page.url(), heading: await page.locator('h1').textContent() };
      await page.screenshot({ path: path.join(output, 'live-search-results.png'), fullPage: true });
    } else {
      report.liveSearch = { note: 'No outstation pickup selector available; live submission was not exercised.' };
    }
    await context.close();
    const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const motionPage = await motionContext.newPage();
    await motionPage.goto(base, { waitUntil: 'networkidle' });
    await motionPage.locator('#services').scrollIntoViewIfNeeded();
    await motionPage.waitForFunction(() => [...document.querySelectorAll('#services [data-reveal]')].some(element => getComputedStyle(element).opacity === '1'));
    report.motion = { scrollReveal: 'visible after scrolling' };
    await motionContext.close();
  } catch (error) {
    report.errors.push(error.stack || String(error));
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
})();
