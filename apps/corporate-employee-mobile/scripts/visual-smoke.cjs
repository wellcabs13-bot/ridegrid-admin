// Browser-only fixtures. Every API call is intercepted; no real bookings, approvals or writes.
// Run with the web dev server on :8099 and EXPO_PUBLIC_API_BASE_URL=http://localhost:3002.
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path");
const out = path.resolve(__dirname, "../verification"); fs.mkdirSync(out, { recursive: true });
const API = "http://localhost:3002", APP = "http://localhost:8099";
const user = { id: "qa-employee-user", name: "Asha Rao", role: "CORPORATE_EMPLOYEE", email: "asha@example.invalid" };
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + 4 * 86400000));
const pickup = new Date(`${day}T09:30:00+05:30`).toISOString();
const fare = (total) => ({ vendorFare: String(total - 600), platformFee: "100.00", taxAmount: "500.00", passThroughTotal: "0.00", discount: "0.00", finalPayable: String(total), taxComponents: [{ name: "GST", rate: "5", amount: "500.00" }], passThroughCharges: [], quoteExpiry: new Date(Date.now() + 3600000).toISOString(), tripDateTime: pickup, days: "1" });
const listing = (id, make, model, category, total, decision, reasons) => ({ id, vehicle: { make, model, variant: null, category, seatingCapacity: 4, luggageCapacity: 2, fuelType: "DIESEL", transmission: "MANUAL", registrationNumber: "QA TEST ONLY" }, vendor: { companyName: "QA Fleet Services" }, driver: { name: "QA Driver", verified: true }, pricing: { pricingPackageId: `pkg-${id}`, packageName: "Pune to Mumbai", tripDays: 1, includedKm: 160, includedHours: null, extraKmRate: 14, extraHourRate: null, driverAllowance: 300, fare: fare(total) }, policy: { decision, reasons } });
const listings = [
  listing("allowed", "Maruti", "Dzire", "SEDAN", 3800, "ALLOWED", []),
  listing("approval", "Toyota", "Innova Crysta", "MUV", 6900, "APPROVAL_REQUIRED", ["Trip amount exceeds the corporate travel policy limit.", "Travel category is not allowed by corporate policy."]),
  listing("blocked", "Mercedes", "E-Class", "LUXURY", 14500, "NOT_ALLOWED", ["Trips must be booked at least 48 hour(s) before pickup."]),
];
const profile = { id: "qa-emp", name: "Asha Rao", employeeCode: "QA-001", email: user.email, mobile: "QA ONLY", designation: "Senior Analyst", grade: "L3", managerName: "QA Manager", isApprover: false, status: "ACTIVE", defaultPickupAddress: "QA Tower, Baner Road, Pune", company: { name: "QA Industries Pvt Ltd", approvalFlow: "MANAGER", billingCycle: "MONTHLY" }, branch: { name: "Pune HQ", city: "Pune" }, department: "Finance", costCenter: "FIN-01" };
const trip = { id: "qa-trip", bookingNumber: "QA-RG-2001", status: "DRIVER_ASSIGNED", tripType: "ONEWAY", tripDays: 1, service: "ONE_WAY", pickupLocation: "QA Tower, Baner Road, Pune", dropLocation: "Mumbai International Airport, Terminal 2", pickupDateTime: pickup, createdAt: new Date().toISOString(), finalFare: "3800.00", fare: fare(3800), packageName: "Pune to Mumbai", vehicle: { make: "Maruti", model: "Dzire", category: "SEDAN", registrationNumber: "QA TEST ONLY", seatingCapacity: 4 }, vendor: { companyName: "QA Fleet Services" }, driver: { name: "QA Driver", mobile: null }, payment: { method: "CORPORATE_CREDIT", status: "PAID" }, tripStatus: "ASSIGNED", approval: null, rebook: { serviceType: "OUTSTATION", tripType: "ONEWAY", pickupCity: "Pune", dropCity: "Mumbai", category: "SEDAN", packageName: "" }, timeline: [{ currentStatus: "CONFIRMED", remarks: "Marketplace booking confirmed with Corporate Credit Account.", changedAt: new Date(Date.now() - 3600000).toISOString() }, { currentStatus: "DRIVER_ASSIGNED", remarks: null, changedAt: new Date().toISOString() }] };
const approval = (status) => ({ id: `qa-req-${status}`, status, rawStatus: status, amount: "6900.00", currentStage: "MANAGER", submittedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: status === "PENDING" ? null : new Date().toISOString(), ride: { pricingPackageId: "pkg-approval", listingId: "approval", serviceType: "OUTSTATION", tripType: "ONEWAY", days: "1", pickupDateTime: pickup, pickupAddress: "QA Tower, Baner Road, Pune", dropAddress: "QA client office, BKC, Mumbai", route: { pickupCity: "Pune", dropCity: "Mumbai", packageName: "Pune to Mumbai" }, vehicle: { make: "Toyota", model: "Innova Crysta", category: "MUV" }, vendorName: "QA Fleet Services", fare: { vendorFare: "6300", platformFee: "100", taxAmount: "500", finalPayable: "6900" }, policyReasons: listings[1].policy.reasons, note: "Team of four travelling with equipment." }, steps: [{ level: 1, stage: "MANAGER", status: status === "PENDING" ? "PENDING" : "APPROVED", actedAt: status === "PENDING" ? null : new Date().toISOString(), remarks: status === "APPROVED" ? "Approved for client visit." : null }], decisionNote: null, booking: null });
const policy = { name: "QA Standard Travel", maxTripAmount: "5000.00", allowedCategories: ["HATCHBACK", "SEDAN"], advanceBookingHours: 48, nightTravelAllowed: false, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false };
const budget = { visible: true, monthly: { limit: "20000.00", used: "12400.00", remaining: "7600.00", periodStart: pickup, periodEnd: pickup }, yearly: { limit: "200000.00", used: "84000.00", remaining: "116000.00", periodStart: pickup, periodEnd: pickup }, basis: "Booked, non-cancelled company rides by pickup date (India time)." };
const notices = [{ id: "n1", title: "Ride request approved", message: "Your ride request was approved. Open Approvals to confirm the booking at a fresh price.", readAt: null, createdAt: new Date().toISOString() }, { id: "n2", title: "Ride booked", message: "QA-RG-2001 is confirmed. Open My Trips for details.", readAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() }];
const options = [["ONE_WAY", "", "Pune", "Mumbai", "", "SEDAN"], ["ONE_WAY", "", "Pune", "Mumbai", "", "MUV"], ["ONE_WAY", "", "Pune", "Mumbai", "", "LUXURY"], ["ROUNDTRIP", "", "Pune", "Lonavala", "", "SEDAN"], ["LOCAL", "Pune", "", "", "8 hr / 80 km", "SEDAN"]].map(([service, city, fromCity, toCity, packageName, vehicleCategory], i) => ({ service, city, fromCity, toCity, packageName, vehicleCategory, pricingPackageId: `opt-${i}` }));
let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [], writes = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(`${API}/api/**`, async (route) => {
    const req = route.request(), url = new URL(req.url()), section = url.pathname.split("/").pop();
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,authorization", "access-control-allow-methods": "GET,POST,OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    let data;
    const id = url.searchParams.get("id");
    if (req.method() === "POST") {
      const body = req.postDataJSON(); writes.push(section);
      for (const key of ["corporateId", "employeeId", "userId", "companyId"]) if (key in body) throw new Error(`Client sent identity field ${key}`);
      if (section === "quote") { const l = listings.find((x) => x.pricing.pricingPackageId === body.pricingPackageId) || listings[1]; data = { id: `quote-${l.id}`, expiresAt: fare(1).quoteExpiry, vehicleId: l.id, fare: l.pricing.fare, policy: l.policy }; }
      else if (section === "book") data = { id: "qa-trip", bookingNumber: "QA-RG-2001", status: "CONFIRMED" };
      else if (section === "approvals") data = { id: "qa-req-PENDING", status: "PENDING", created: true };
      else if (section === "notifications") data = { updated: 1 };
      else throw new Error(`Unexpected write ${url.pathname}`);
    } else if (url.pathname === "/api/marketplace/options") data = options;
    else if (url.pathname === "/api/auth/me") data = user;
    else if (section === "home") data = { profile, upcoming: trip, activeTrips: 0, pendingApprovals: 1, approvedToBook: 1, unread: 1, policy, budget, asOf: new Date().toISOString() };
    else if (section === "profile") data = profile;
    else if (section === "config") data = { support: { name: "RideGrid Support", phoneHref: "tel:+910000000000", emailHref: "mailto:qa@example.invalid", whatsapp: "https://example.invalid/wa" }, paymentMethod: "CORPORATE_CREDIT", services: ["ONE_WAY", "ROUNDTRIP", "LOCAL"], profileEdit: false, pushRegistration: false, rebook: true, termsPath: "/terms", privacyPath: "/privacy", cancellationPath: "/cancel" };
    else if (section === "policy") data = { policy, approvalStages: [{ level: 1, approver: "Reporting manager", maxAmount: 10000 }, { level: 2, approver: "Finance controller", maxAmount: null }], approvalFlow: "MANAGER", employeeLimits: { monthly: "20000.00", yearly: "200000.00" } };
    else if (section === "budget") data = budget;
    else if (section === "search") data = { listings, pagination: { page: 1, totalPages: 1, total: 3 } };
    else if (section === "approvals") data = id ? approval(id.replace("qa-req-", "")) : { items: [approval("PENDING"), approval("APPROVED"), approval("REJECTED")], page: 1, hasMore: false };
    else if (section === "trips") data = id ? trip : { items: [trip], page: 1, hasMore: false };
    else if (section === "trip-status") data = { status: "DRIVER_ASSIGNED", trip: null, liveTracking: false, location: null };
    else if (section === "notifications") data = { items: notices, unread: 1, page: 1, hasMore: false };
    else throw new Error(`Unexpected fixture request ${url.pathname}`);
    return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto(APP, { waitUntil: "networkidle", timeout: 240000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ timeout: 120000 });
  async function shot(name, width) {
    await page.waitForTimeout(300);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Horizontal overflow on ${name} at ${width}px`);
    await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
  }
  for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await shot("login", width); }
  await page.evaluate(async (user) => {
    const entries = [...__r.getModules()]; const get = (part) => __r(entries.find(([, m]) => m.verboseName === part)[0]);
    get("src/storage/session.ts").sessionStore.write = async () => {};
    await get("src/services/api.ts").setSession({ accessToken: "qa-only", refreshToken: "qa-only", expiresAt: "2099-01-01", user });
    window.qaRouter = entries.map(([, m]) => m.publicModule?.exports).find((e) => e?.router?.push && e.router?.replace).router;
  }, user);
  const go = async (url, text) => { await page.evaluate((u) => window.qaRouter.push(u), url); await page.getByText(text, { exact: true }).filter({ visible: true }).first().waitFor(); };
  const results = `/results?serviceType=OUTSTATION&tripType=ONEWAY&pickupCity=Pune&dropCity=Mumbai&date=${day}&time=09:30&days=1&category=SEDAN&packageName=`;
  const screens = [
    ["home", "/", "Hello, Asha"], ["book", "/book", "Book a ride"], ["results", results, "Available rides"],
    ["approvals", "/approvals", "Approval requests"], ["approval-pending", "/approval?id=qa-req-PENDING", "Ride request"],
    ["approval-approved", "/approval?id=qa-req-APPROVED", "Confirm your approved ride"], ["trips", "/trips", "My trips"],
    ["trip", "/trip?id=qa-trip", "QA-RG-2001"], ["policy", "/policy", "QA Standard Travel"], ["notifications", "/notifications", "Updates"],
    ["account", "/account", "Account"], ["support", "/support?booking=QA-RG-2001", "Support"],
  ];
  const rides = [["ride-allowed", "Maruti Dzire", "Confirm ride"], ["ride-approval", "Toyota Innova Crysta", "Submit for approval"], ["ride-not-allowed", "Mercedes E-Class", "This ride is not allowed"]];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, url, text] of screens) { await go(url, text); await shot(name, width); }
    for (const [name, vehicle, marker] of rides) {
      await go(results, "Available rides");
      await page.getByRole("button", { name: new RegExp(`^${vehicle}`) }).filter({ visible: true }).first().click();
      await page.getByText(marker, { exact: true }).filter({ visible: true }).first().waitFor();
      await shot(name, width);
    }
  }
  if (await page.getByRole("button", { name: /Confirm ride|Submit for approval/ }).filter({ visible: true }).count()) throw new Error("A not-allowed ride offered a booking action");
  // Allowed flow: confirm, then land on the central booking.
  await go(results, "Available rides");
  await page.getByRole("button", { name: /^Maruti Dzire/ }).filter({ visible: true }).first().click();
  await page.getByLabel("Drop address", { exact: true }).filter({ visible: true }).last().fill("QA client office, BKC, Mumbai");
  await page.getByRole("button", { name: "Confirm ride", exact: true }).filter({ visible: true }).last().click();
  await page.getByRole("button", { name: "Book ride", exact: true }).filter({ visible: true }).last().click();
  await page.getByText("QA-RG-2001", { exact: true }).filter({ visible: true }).first().waitFor();
  // Approval flow: submit, then land on the pending request.
  await go(results, "Available rides");
  await page.getByRole("button", { name: /^Toyota Innova Crysta/ }).filter({ visible: true }).first().click();
  await page.getByLabel("Drop address", { exact: true }).filter({ visible: true }).last().fill("QA client office, BKC, Mumbai");
  await page.getByRole("button", { name: "Submit for approval", exact: true }).filter({ visible: true }).last().click();
  await page.getByRole("button", { name: "Submit request", exact: true }).filter({ visible: true }).last().click();
  await page.getByText("Approval progress", { exact: true }).filter({ visible: true }).first().waitFor();
  if (errors.length) throw new Error(errors.join("\n"));
  const count = (screens.length + rides.length + 1) * 2;
  fs.writeFileSync(path.join(out, "visual-results.json"), JSON.stringify({ fixtureOnly: true, widths: [320, 390], screenshots: count, screens: ["login", ...screens.map((s) => s[0]), ...rides.map((r) => r[0])], writes, pageErrors: errors }, null, 2));
  console.log(`PASS: ${count} screenshots, no horizontal overflow or page errors; allowed booking and approval submission flows completed.`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
