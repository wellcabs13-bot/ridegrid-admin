// Isolated browser-only UI fixtures. No production credentials, requests or writes.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../verification");
fs.mkdirSync(root, { recursive: true });
const user = { id: "qa-vendor-user", role: "VENDOR", name: "QA Vendor", email: "vendor@example.invalid" };
const driver = { id: "driver-qa", firstName: "QA", lastName: "Driver", status: "ACTIVE", licenseNumber: "QA-LICENCE", city: "Pune", user: { mobile: null }, documents: [], vehicles: [{ id: "vehicle-qa", registrationNumber: "QA TEST ONLY" }], bookings: [] };
const doc = { id: "doc-qa", documentType: "INSURANCE", expiryDate: "2026-10-01T00:00:00Z", status: "APPROVED", fileUrl: "/api/files/qa" };
const vehicle = { id: "vehicle-qa", registrationNumber: "QA TEST ONLY", make: "QA", model: "Sedan", category: "SEDAN", seatingCapacity: 4, fuelType: "DIESEL", transmission: "MANUAL", homeCity: "Pune", status: "AVAILABLE", isVerified: true, driverId: driver.id, driver: { id: driver.id, firstName: driver.firstName, lastName: driver.lastName }, documents: [doc] };
const booking = { id: "booking-qa", bookingNumber: "QA-BOOKING-001", pickupLocation: "Pune Central, pickup entrance", dropLocation: "Mumbai International Airport, Terminal 2", pickupDateTime: "2026-10-01T06:30:00Z", reservedFrom: "2026-09-30T18:30:00Z", reservedUntil: "2026-10-01T18:30:00Z", tripDays: 1, tripType: "ONEWAY", status: "CONFIRMED", vendorEarning: "3500", vehicleId: vehicle.id, driverId: null, vehicle, driver: null, customer: { firstName: "QA", lastName: "Customer" }, pricingPackage: { packageName: "Pune to Mumbai", packageType: "OUTSTATION_ONE_WAY" }, trip: null, statusHistory: [{ id: "h", currentStatus: "CONFIRMED", action: "CONFIRMED", changedAt: "2026-09-24T12:00:00Z" }], transactions: [{ paymentStatus: "PENDING", paymentMethod: "CASH" }] };
driver.bookings = [booking];
const notice = { id: "notice-qa", title: "New booking received", message: "Your assigned vehicle has an upcoming trip. Review the booking details.", readAt: null, createdAt: "2026-09-24T12:00:00Z" };
const paged = items => ({ items, page: 1, hasMore: false });
let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("http://localhost:3001/api/**", async route => {
    const url = new URL(route.request().url());
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,authorization", "access-control-allow-methods": "GET,POST,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    let data;
    const section = url.pathname.split("/").pop();
    if (section === "home") data = { todayBookings: 1, upcoming: 1, active: 0, pending: 1, availableVehicles: 2, bookedVehicles: 1, availableDrivers: 2, assignedDrivers: 1, attentionVehicles: 1, expiringDocuments: 1, nextTrips: [booking], notifications: [notice], asOf: new Date().toISOString() };
    else if (section === "bookings") data = url.searchParams.has("id") ? booking : paged([booking]);
    else if (section === "fleet") data = url.searchParams.has("id") ? vehicle : paged([vehicle]);
    else if (section === "drivers") data = url.searchParams.has("id") ? driver : paged([driver]);
    else if (section === "notifications") data = { ...paged([notice]), unread: 1 };
    else if (section === "profile") data = { id: "vendor-qa", companyName: "QA Fleet Operations", address: "QA office address", city: "Pune", state: "Maharashtra", pinCode: "411001", homeCity: "Pune", isApproved: true, bankName: "QA Bank", accountLast4: "0000", user, documents: [doc] };
    else if (section === "config") data = { support: { phoneHref: "tel:+910000000000", emailHref: "mailto:qa@example.invalid", whatsapp: "https://example.invalid" }, categories: ["SEDAN", "SUV"], fuels: ["DIESEL", "PETROL"], transmissions: ["MANUAL", "AUTOMATIC"] };
    else if (section === "availability") data = { date: "2026-10-01", hasMore: false, vehicles: [{ ...vehicle, available: false }], drivers: [{ id: driver.id, firstName: "QA", lastName: "Driver", status: "ACTIVE", available: false }] };
    else if (section === "manage") data = { vendorId: "vendor-qa", cities: ["Pune", "Mumbai", "Nashik"], pairs: [{ ...vehicle, driver: { id: driver.id, firstName: "QA", lastName: "Driver" } }], rates: [{ id: "rate-qa", version: 1, status: "PENDING", service: "OUTSTATION_ONE_WAY", city: "Pune", fare: "3500", effectiveFrom: "2026-10-01T00:00:00Z", pricingPackage: { packageName: "Pune to Mumbai", vehicle: { registrationNumber: "QA TEST ONLY" } } }] };
    else if (section === "earnings") data = { wallet: { balance: "3500" }, totals: [{ settlementStatus: "PENDING", _sum: { netAmount: "3500" } }], settlements: [], completed: [], hasMore: false };
    else if (section === "assignment") { booking.status = "DRIVER_ASSIGNED"; booking.driverId = driver.id; booking.driver = { id: driver.id, firstName: "QA", lastName: "Driver" }; data = { id: booking.id }; }
    else if (section === "me") data = user;
    else throw new Error(`Unexpected fixture endpoint: ${url.pathname}`);
    return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("http://localhost:8097", { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await page.screenshot({ path: path.join(root, "login-390.png") });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({ path: path.join(root, "login-320.png") });
  await page.evaluate(async user => {
    const entries = [...__r.getModules()];
    const get = part => __r(entries.find(([, m]) => m.verboseName === part)[0]);
    get("src/storage/session.ts").sessionStore.write = async () => {};
    await get("src/services/api.ts").setSession({ accessToken: "qa-only", refreshToken: "qa-only", expiresAt: "2099-01-01", user });
    window.qaRouter = entries.map(([, m]) => m.publicModule?.exports).find(e => e?.router?.push && e.router?.replace).router;
  }, user);
  const screens = [["home", "/", "Operations today"], ["bookings", "/bookings", "Bookings & trips"], ["booking", "/booking?id=booking-qa", "Booking details"], ["fleet", "/fleet", "Your fleet"], ["vehicle", "/vehicle?id=vehicle-qa", "Vehicle details"], ["drivers", "/drivers", "Your drivers"], ["driver", "/driver?id=driver-qa", "Driver details"], ["availability", "/availability", "Availability"], ["pricing", "/pricing", "Vendor pricing"], ["notifications", "/notifications", "Notifications"], ["profile", "/profile", "Business profile"], ["earnings", "/earnings", "Earnings & settlements"], ["edit-vehicle", "/edit-vehicle", "Add vehicle"], ["edit-driver", "/edit-driver", "Add driver"], ["upload", "/document-upload?entity=vehicle&entityId=vehicle-qa", "Upload document"]];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, url, title] of screens) {
      await page.evaluate(url => window.qaRouter.push(url), url);
      await page.getByText(title, { exact: true }).filter({ visible: true }).first().waitFor();
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Horizontal overflow: ${name} at ${width}`);
      await page.screenshot({ path: path.join(root, `${name}-${width}.png`), fullPage: true });
    }
  }
  await page.evaluate(() => window.qaRouter.push("/booking?id=booking-qa"));
  await page.getByRole("button", { name: "Confirm aligned driver", exact: true }).click();
  await page.getByText("Assignment confirmed by RideGrid.", { exact: true }).waitFor();
  if (errors.length) throw new Error(errors.join("\n"));
  fs.writeFileSync(path.join(root, "visual-results.json"), JSON.stringify({ fixtureOnly: true, screenshots: 32, widths: [320, 390], screens: screens.map(s => s[0]), assignmentInteraction: "passed", pageErrors: errors }, null, 2));
  console.log("PASS: 32 screenshots at 320/390 px; assignment interaction; no horizontal overflow or page errors. Fixtures only.");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });

