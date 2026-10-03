// Development-only visual QA. API calls are intercepted; no real mutations or credentials.
// SecureStore is replaced only in this browser's Metro module instance, never in source.
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
const folder = path.resolve(__dirname, "../verification/fixtures");
fs.mkdirSync(folder, { recursive: true });
const user = {
  id: "qa-user",
  name: "QA Traveller",
  email: "qa@example.invalid",
  mobile: "0000000000",
  role: "CUSTOMER",
};
const fare = {
  vendorFare: "3600",
  platformFee: "100",
  taxAmount: "180",
  passThroughTotal: "0",
  vendorFundedDiscount: "0",
  rideGridFundedDiscount: "0",
  finalPayable: "3880",
  quoteExpiry: "2099-01-01T00:00:00Z",
  tripDateTime: "2030-09-24T06:30:00.000Z",
  taxComponents: [],
  passThroughCharges: [],
  tripMetrics: { days: "2" },
};
const option = {
  service: "ROUNDTRIP",
  city: "",
  fromCity: "Pune",
  toCity: "Mumbai",
  packageName: "Pune - Mumbai",
  vehicleCategory: "SEDAN",
  pricingPackageId: "qa-package",
};
const saved = {
  id: "qa-route",
  serviceType: "OUTSTATION",
  tripType: "ROUNDTRIP",
  pickupCity: "Pune",
  dropCity: "Mumbai",
  category: "SEDAN",
  packageName: "",
  fareWatch: true,
  createdAt: "2026-09-22",
};
const listing = {
  id: "qa-vehicle",
  vehicle: {
    make: "QA",
    model: "Sedan",
    category: "SEDAN",
    registrationNumber: "QA TEST ONLY",
    fuelType: "DIESEL",
    transmission: "MANUAL",
    seatingCapacity: 4,
  },
  vendor: { companyName: "QA Fleet", approved: true },
  driver: { name: "QA Driver", verified: true },
  marketplace: { verified: true, available: true },
  pricing: {
    pricingPackageId: "qa-package",
    packageName: "Roundtrip",
    includedKm: 500,
    includedHours: 0,
    extraKmRate: 14,
    extraHourRate: 150,
    driverAllowance: 500,
    finalPayable: 3880,
    quote: fare,
  },
};
const booking = {
  id: "qa-booking",
  bookingNumber: "QA-ONLY-001",
  status: "CONFIRMED",
  tripType: "ROUNDTRIP",
  tripDays: 2,
  pickupLocation: "Pune Central",
  dropLocation: "Mumbai Central",
  pickupDateTime: "2030-09-24T06:30:00Z",
  finalFare: "3880",
  estimatedFare: "3880",
  priceSnapshot: fare,
  vehicle: listing.vehicle,
  vendor: listing.vendor,
  driver: { firstName: "QA", lastName: "Driver", user: { mobile: null } },
  transactions: [
    {
      id: "qa-payment",
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      amount: "3880",
    },
  ],
  statusHistory: [
    { currentStatus: "CONFIRMED", createdAt: "2026-09-22T12:00:00Z" },
  ],
  rebook: saved,
};
let browser, page;
async function main() {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("http://localhost:3001/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let data;
    if (req.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type,authorization",
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        },
      });
    if (url.pathname === "/api/auth/me") data = user;
    else if (url.pathname === "/api/marketplace/options")
      data = [
        option,
        { ...option, service: "ONE_WAY" },
        {
          ...option,
          service: "LOCAL",
          city: "Pune",
          packageName: "8 hours / 80 km",
        },
      ];
    else if (url.pathname === "/api/marketplace/search")
      data = {
        listings: [listing],
        pagination: { page: 1, totalPages: 1, total: 1 },
      };
    else if (url.pathname === "/api/marketplace/listing-assets") data = {};
    else if (url.pathname === "/api/mobile/profile")
      data = {
        id: "qa-customer",
        firstName: "QA",
        lastName: "Traveller",
        user: { ...user, isVerified: true },
      };
    else if (url.pathname === "/api/mobile/config")
      data = {
        wallet: false,
        onlineCheckout: false,
        paymentMethods: ["CASH"],
        support: {
          name: "QA Support",
          phoneHref: "tel:0000000000",
          emailHref: "mailto:qa@example.invalid",
        },
        termsPath: "/terms",
        privacyPath: "/privacy",
      };
    else if (url.pathname === "/api/mobile/routes")
      data = { routes: [saved], automatedAlerts: false };
    else if (url.pathname === "/api/mobile/rewards")
      data = {
        account: {
          totalPoints: 250,
          transactions: [
            {
              id: "qa-points",
              points: 250,
              description: "QA fixture points",
              transactionType: "EARNED",
              createdAt: "2026-09-22",
            },
          ],
        },
        redemption: false,
      };
    else if (url.pathname === "/api/mobile/notifications")
      data = {
        items: [
          {
            id: "qa-notice",
            title: "Booking confirmed",
            message:
              "Your QA journey is ready. Open My Trips to review your booking.",
            readAt: null,
            createdAt: "2026-09-22T12:00:00Z",
          },
        ],
        unread: 1,
        page: 1,
        hasMore: false,
      };
    else if (url.pathname === "/api/mobile/bookings")
      data = { bookings: [booking], page: 1, hasMore: false };
    else if (url.pathname === "/api/mobile/trip-status")
      data = {
        status: "CONFIRMED",
        trip: { status: "ASSIGNED", driverAssignedAt: "2026-09-22T12:00:00Z" },
        liveTracking: false,
      };
    else if (url.pathname === "/api/marketplace/location-search") data = [];
    else if (url.pathname === "/api/pricing/quote")
      data = { id: "qa-quote", snapshot: fare };
    else if (url.pathname === "/api/marketplace/cash-booking")
      data = { id: "qa-booking" };
    else throw Error("Unexpected fixture API " + url.pathname);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ success: true, data }),
    });
  });
  await page.goto("http://localhost:8093", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page
    .getByRole("button", { name: "Find your next ride", exact: true })
    .waitFor();
  await page.evaluate(async (user) => {
    const entries = [...__r.getModules()];
    const get = (part) =>
      __r(entries.find(([id, m]) => m.verboseName === part)[0]);
    get("src/storage/session.ts").sessionStore.write = async () => {};
    await get("src/services/api.ts").setSession({
      accessToken: "qa-only",
      refreshToken: "qa-only",
      expiresAt: "2099-01-01",
      user,
    });
    window.qaRouter = entries
      .map(([id, m]) => m.publicModule?.exports)
      .find((e) => e?.router?.push && e.router?.replace).router;
  }, user);
  async function snap(name) {
    await page.waitForTimeout(500);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Horizontal overflow: " + name);
    await page.screenshot({
      path: path.join(folder, name + ".png"),
      fullPage: true,
    });
  }
  async function nav(url) {
    await page.evaluate((url) => window.qaRouter.push(url), url);
    await page.waitForTimeout(650);
  }
  await snap("home");
  await nav(
    "/search?serviceType=OUTSTATION&tripType=ROUNDTRIP&pickupCity=Pune&dropCity=Mumbai&category=SEDAN",
  );
  await page
    .getByRole("textbox", { name: "Departure date (YYYY-MM-DD)", exact: true })
    .fill("2030-09-24");
  await page
    .getByLabel("Return date (YYYY-MM-DD)", { exact: true })
    .fill("2030-09-25");
  await snap("search");
  await page.getByRole("button", { name: "Find my ride", exact: true }).click();
  await page
    .getByRole("button", { name: "View ride & fare", exact: true })
    .waitFor();
  await snap("results");
  await page
    .getByRole("button", { name: "View ride & fare", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Book this vehicle", exact: true })
    .waitFor();
  await snap("listing");
  await page
    .getByRole("button", { name: "Book this vehicle", exact: true })
    .click();
  await page.getByLabel("Pickup address", { exact: true }).fill("Pune Central");
  await page.getByLabel("Drop address", { exact: true }).fill("Mumbai Central");
  await snap("booking");
  await page
    .getByRole("button", { name: "Get final quote", exact: true })
    .click();
  await page.getByText("Cash on pickup", { exact: true }).waitFor();
  await snap("payment");
  await page.getByRole("switch", { name: "Accept booking terms" }).click();
  await page
    .getByRole("button", { name: "Confirm cash booking", exact: true })
    .scrollIntoViewIfNeeded();
  await snap("payment-confirm");
  await page
    .getByRole("button", { name: "Confirm cash booking", exact: true })
    .click();
  await page.getByText("Booking confirmed!", { exact: true }).waitFor();
  await snap("confirmation");
  await page
    .getByText("ROUTE OVERVIEW", { exact: true })
    .scrollIntoViewIfNeeded();
  await snap("trip-status");
  for (const [url, name] of [
    ["/trips", "trips"],
    ["/notifications", "notifications"],
    ["/account", "account"],
    ["/assistant", "assistant"],
    ["/saved-routes", "saved-routes"],
    ["/rewards", "rewards"],
    ["/safety", "safety"],
  ]) {
    await nav(url);
    await snap(name);
  }
  await nav("/trips");
  await page.getByRole("button", { name: "Quick rebook", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Departure date (YYYY-MM-DD)", exact: true })
    .waitFor();
  if (
    await page
      .getByRole("textbox", {
        name: "Departure date (YYYY-MM-DD)",
        exact: true,
      })
      .inputValue()
  )
    throw Error("Rebook retained old departure date");
  await page.setViewportSize({ width: 320, height: 740 });
  await snap("search-320");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: 16 fixture screenshots, no runtime errors or page overflow, new dates required for rebooking. No real API writes.",
  );
  await browser.close();
}
main().catch(async (e) => {
  console.error(e.message);
  if (page) {
    console.error((await page.locator("body").innerText()).slice(0, 2000));
    await page.screenshot({ path: path.join(folder, "failure.png") });
  }
  await browser?.close();
  process.exit(1);
});
