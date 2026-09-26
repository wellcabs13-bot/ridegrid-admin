// Browser-only fixtures. All API calls are intercepted; no real assignments or writes.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const out = path.resolve(__dirname, '../verification'); fs.mkdirSync(out, { recursive: true });
const user = { id: 'qa-driver-user', name: 'Alex Driver', role: 'DRIVER', email: 'driver@example.invalid' };
const vehicle = { id: 'qa-car', make: 'Toyota', model: 'Innova Crysta', registrationNumber: 'QA TEST ONLY', category: 'MUV', fuelType: 'DIESEL', transmission: 'MANUAL', vendor: { companyName: 'QA Fleet' } };
const document = { id: 'qa-doc', documentType: 'DRIVING_LICENSE', status: 'APPROVED', expiryDate: '2027-03-01T00:00:00Z' };
const booking = { id: 'qa-booking', bookingNumber: 'QA-RG-001', status: 'DRIVER_ASSIGNED', pickupLocation: 'Pune railway station, main entrance', dropLocation: 'Mumbai International Airport, Terminal 2 arrivals', pickupDateTime: '2026-09-25T09:00:00Z', tripType: 'ONEWAY', vehicle, vendor: vehicle.vendor, customer: { firstName: 'QA', lastName: 'Customer' }, customerPhone: null, pricingPackage: { packageType: 'OUTSTATION_ONE_WAY', packageName: 'Intercity' }, trip: null, statusHistory: [] };
let browser, rejectNextTransition = true;
(async () => {
  browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = [], mutations = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('http://localhost:3001/api/**', async route => {
    const url = new URL(route.request().url()), section = url.pathname.split('/').pop();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data;
    if (section === 'trips' && route.request().method() === 'POST') {
      if (rejectNextTransition) { rejectNextTransition = false; return route.fulfill({ status: 503, headers, contentType: 'application/json', body: JSON.stringify({ success: false }) }); }
      const body = route.request().postDataJSON(); mutations.push(body.action);
      const now = new Date().toISOString();
      booking.trip ||= { id: 'qa-trip', driverAssignedAt: now, arrivedPickupAt: null, tripStartedAt: null, tripCompletedAt: null };
      if (body.action === 'ARRIVED') { booking.trip.status = 'ARRIVED_AT_PICKUP'; booking.trip.arrivedPickupAt = now; }
      if (body.action === 'START') { booking.status = 'TRIP_STARTED'; booking.trip.status = 'STARTED'; booking.trip.tripStartedAt = now; }
      if (body.action === 'COMPLETE') { booking.status = 'TRIP_COMPLETED'; booking.trip.status = 'COMPLETED'; booking.trip.tripCompletedAt = now; }
      data = booking;
    } else if (section === 'trips') data = url.searchParams.has('id') ? booking : { items: [booking], page: 1, hasMore: false };
    else if (section === 'dashboard') data = { today: [booking], next: booking, active: booking.trip && booking.status !== 'TRIP_COMPLETED' ? [booking] : [], unread: 1, expiringDocuments: 0, asOf: new Date().toISOString() };
    else if (section === 'profile') data = { id: 'qa-driver', firstName: 'Alex', lastName: 'Driver', status: 'ACTIVE', licenseNumber: '••••1234', user: { ...user, mobile: null, isVerified: true }, vehicles: [vehicle], documents: [document] };
    else if (section === 'vehicle') data = [vehicle];
    else if (section === 'documents') data = [document];
    else if (section === 'notifications') data = [{ id: 'qa-notice', title: 'New driver assignment', message: 'QA-RG-001: your trip assignment is ready.', readAt: null, createdAt: new Date().toISOString() }];
    else if (section === 'earnings') data = { items: [], payrolls: [], incentives: [], description: 'No recorded allocations in this QA fixture.' };
    else if (section === 'config') data = { support: { phoneHref: 'tel:+910000000000', emailHref: 'mailto:qa@example.invalid', whatsapp: 'https://example.invalid' }, emergencyPhone: null };
    else if (section === 'me') data = user;
    else throw new Error(`Unexpected fixture request ${url.pathname}`);
    return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.goto('http://localhost:8098', { waitUntil: 'networkidle', timeout: 180000 });
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await page.screenshot({ path: path.join(out, `login-${width}.png`) }); }
  await page.evaluate(async user => {
    const entries = [...__r.getModules()]; const get = part => __r(entries.find(([, m]) => m.verboseName === part)[0]);
    get('src/storage/session.ts').sessionStore.write = async () => {};
    await get('src/services/api.ts').setSession({ accessToken: 'qa-only', refreshToken: 'qa-only', expiresAt: '2099-01-01', user });
    window.qaRouter = entries.map(([, m]) => m.publicModule?.exports).find(e => e?.router?.push && e.router?.replace).router;
  }, user);
  const screens = [['home', '/', 'Ready, Alex?'], ['upcoming', '/trips', 'My trips'], ['trip', '/trip?id=qa-booking', 'QA-RG-001'], ['vehicle', '/vehicle', 'Assigned vehicle'], ['notifications', '/notifications', 'Notifications'], ['documents', '/documents', 'Driver documents'], ['safety', '/safety?id=qa-booking', 'Safety first'], ['account', '/account', 'Your account'], ['earnings', '/earnings', 'Recorded earnings']];
  async function shot(name, width) { await page.waitForTimeout(250); if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Overflow ${name} ${width}`); await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true }); }
  for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); for (const [name, url, title] of screens) { await page.evaluate(url => window.qaRouter.push(url), url); await page.getByText(title, { exact: true }).filter({ visible: true }).first().waitFor(); await shot(name, width); } }
  await page.evaluate(() => window.qaRouter.push('/trip?id=qa-booking'));
  await page.getByRole('button', { name: 'Arrived at pickup', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByText('The service is temporarily unavailable. Please try again.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Arrived at pickup', exact: true }).waitFor();
  if (mutations.length) throw new Error('Failed mutation changed trip state');
  for (const [label, state] of [['Arrived at pickup', 'arrived'], ['Start trip', 'started'], ['Complete trip', 'completed']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).waitFor({ state: 'hidden' });
    for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await shot(state, width); }
    if (state === 'arrived') { await page.evaluate(() => window.qaRouter.push('/trips')); await page.getByRole('button', { name: 'ACTIVE', exact: true }).click(); for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await shot('active', width); } await page.evaluate(() => window.qaRouter.push('/trip?id=qa-booking')); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  if (mutations.join(',') !== 'ARRIVED,START,COMPLETE') throw new Error('Trip interaction failed');
  fs.writeFileSync(path.join(out, 'visual-results.json'), JSON.stringify({ fixtureOnly: true, widths: [320,390], screenshots: 28, screens: screens.map(s => s[0]).concat(['login','active','arrived','started','completed']), tripActions: mutations, pageErrors: errors }, null, 2));
  console.log('PASS: 28 screenshots, no overflow or page errors, arrival/start/completion confirmed.');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
