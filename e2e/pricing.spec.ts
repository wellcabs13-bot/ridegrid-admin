import { test, expect } from "@playwright/test";

test("pricing management rejects unauthenticated readers",async({request})=>{
  const response=await request.get("/api/pricing/manage");
  expect([401,403]).toContain(response.status());
});
test("legacy pricing writes cannot bypass authentication",async({request})=>{
  for(const endpoint of ["rules","packages"]){
    const response=await request.post(`/api/pricing/${endpoint}`,{data:{vendorId:"unauthorized",baseFare:"1"}});
    expect([401,403]).toContain(response.status());
  }
});
test("quote endpoint rejects malformed trip dates",async({request})=>{
  const response=await request.post("/api/pricing/quote",{data:{at:"not-a-date",pricingPackageId:"invalid",idempotencyKey:"invalid"}});
  expect([400,401,403]).toContain(response.status());
});
test("pricing approval cannot be called without authorization",async({request})=>{
  const response=await request.post("/api/pricing/manage",{data:{action:"approve",id:"not-a-rate",expectedVersion:1,reason:"unauthorized"}});
  expect([401,403]).toContain(response.status());
});

test("simplified vendor and policy workflows keep authorization", async ({ request }) => {
  expect([401, 403]).toContain((await request.get("/api/pricing/manage?view=simple&vendorId=foreign")).status());
  for (const action of ["simple-rates", "simple-policy"]) {
    expect([401, 403]).toContain((await request.post("/api/pricing/manage", { data: { action, vendorId: "foreign" } })).status());
  }
});

test("simple pricing guides the operator on desktop and mobile", async ({ page }) => {
  // Browser-only fixture: no real vendor data or database writes.
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/pricing/manage**", async route => {
    if (route.request().method() === "POST") {
      writes.push(route.request().postDataJSON());
      return route.fulfill({ json: { success: true, data: { vehicleCount: 1, rateCount: 2, approved: 0, pending: 2 } } });
    }
    return route.fulfill({ json: { success: true, data: { role: "SUPER_ADMIN", vendorId: new URL(route.request().url()).searchParams.get("vendorId") || undefined,
      vendors: [{ id: "test-vendor", companyName: "Browser test vendor" }], pairs: [{ id: "test-car", make: "Test", model: "Car", registrationNumber: "TEST-001", driverId: "test-driver", driver: { id: "test-driver", firstName: "Test", lastName: "Driver" } }],
      cities: ["Pune", "Mumbai", "Nashik"], rates: [], policies: [], toursGap: "No Tour catalog or association exists." } } });
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing");
    await expect(page.getByRole("tab")).toHaveCount(3);
    await page.getByLabel("1. Select Vendor").selectOption("test-vendor");
    await page.getByRole("checkbox", { name: /TEST-001/ }).check();
    await page.getByRole("button", { name: "Roundtrip", exact: true }).click();
    await page.getByLabel("Pickup City", { exact: true }).fill("Pune");
    await page.getByLabel("KM Per Day", { exact: true }).fill("300");
    await page.getByLabel("Rate Per KM (₹)", { exact: true }).fill("14");
    await page.getByLabel("Driver Allowance Per Day (₹)", { exact: true }).fill("500");
    await page.getByRole("button", { name: "Select all visit cities" }).click();
    await expect(page.getByRole("checkbox", { name: "Pune", exact: true })).toHaveCount(0);
    await expect(page.locator("output")).toContainText("4,700.00");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Save Roundtrip Price" }).click();
    await expect(page.getByRole("status").filter({ hasText: "price saved" })).toBeVisible();
    expect(writes.at(-1)).toMatchObject({ action: "simple-rates", destinations: ["Mumbai", "Nashik"], kmPerDay: "300", perKm: "14", driverAllowance: "500" });
  }
});

test("roundtrip booking requests a fresh server quote for trip days", async ({ page }) => {
  const days: string[] = [];
  await page.route("**/api/marketplace/search?**", route => route.fulfill({ json: { success: true, data: { listings: [{ id: "test-car", vehicle: { make: "Test", model: "Car", category: "SEDAN", fuelType: "PETROL", transmission: "MANUAL", seatingCapacity: 4 }, pricing: { pricingPackageId: "test-package", baseFare: 4700, finalPayable: 5000, quote: {}, includedKm: 300, driverAllowance: 500 } }] } } }));
  await page.route("**/api/pricing/quote", route => {
    const request = route.request().postDataJSON(); days.push(request.days);
    // Deliberately distinctive server value: the browser must not compute the payable.
    const total = request.days === "3" ? "15999.33" : "5000.00";
    return route.fulfill({ json: { success: true, data: { id: "test-quote", snapshot: { vendorFare: "4700.00", platformFee: "300.00", taxAmount: "0.00", vendorFundedDiscount: "0.00", rideGridFundedDiscount: "0.00", passThroughTotal: "0.00", finalPayable: total, vendorPayout: "4700.00", rideGridRevenue: "300.00", quoteExpiry: "2035-01-01T00:00:00Z", taxComponents: [], passThroughCharges: [], calculationRule: { operational: { service: "ROUNDTRIP" } } } } } });
  });
  await page.goto("/marketplace/booking?listingId=test-car&serviceType=OUTSTATION&tripType=ROUNDTRIP&pickupCity=Pune&dropCity=Mumbai&date=2030-01-01&time=10:00");
  await page.getByLabel("Trip days", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Update trip price" }).click();
  await expect(page.getByText("Current quote: 3 days.")).toBeVisible();
  await expect(page.getByText("₹15999.33", { exact: true })).toBeVisible();
  expect(days).toEqual(["1", "3"]);
});
