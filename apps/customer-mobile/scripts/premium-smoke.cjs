// Read-only browser QA of the Expo web preview. All API responses come from the
// existing backend; no fixtures are inserted and no customer actions are submitted.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
let activeBrowser, activePage;
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  activeBrowser = browser;
  activePage = page;
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  // Native apps do not use browser CORS. Forward live GETs for this web-only QA.
  await page.route("http://localhost:3001/api/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "http://localhost:8093",
          "access-control-allow-headers": "content-type",
        },
      });
    if (route.request().method() !== "GET")
      throw new Error("Read-only QA blocked a mutation");
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "access-control-allow-origin": "http://localhost:8093",
      },
    });
  });
  await page.goto("http://localhost:8093", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page
    .getByRole("button", { name: "Find your next ride", exact: true })
    .waitFor({ timeout: 60000 });
  await page.screenshot({
    path: path.resolve(__dirname, "../verification/premium-home.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Find your next ride", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pickup city: Choose" })
    .waitFor({ timeout: 60000 });
  const folder = path.resolve(__dirname, "../verification");
  fs.mkdirSync(folder, { recursive: true });
  await page.screenshot({
    path: path.join(folder, "premium-search.png"),
    fullPage: true,
  });
  const live = await (
    await page.request.get("http://localhost:3001/api/marketplace/options")
  ).json();
  const option = live.data.find((o) => o.service === "ONE_WAY");
  if (option) {
    await page.getByRole("button", { name: "ONE WAY", exact: true }).click();
    await page.getByRole("button", { name: "Pickup city: Choose" }).click();
    await page
      .getByRole("button", { name: option.fromCity, exact: true })
      .click();
    await page.getByRole("button", { name: "Destination: Choose" }).click();
    await page
      .getByRole("button", { name: option.toCity, exact: true })
      .click();
    await page
      .getByRole("button", {
        name: option.vehicleCategory.replaceAll("_", " "),
        exact: true,
      })
      .click();
    await page.waitForTimeout(1500);
    await page
      .getByRole("textbox", {
        name: "Departure date (YYYY-MM-DD)",
        exact: true,
      })
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    console.log(
      "After date fill",
      await page
        .getByRole("textbox", {
          name: "Departure date (YYYY-MM-DD)",
          exact: true,
        })
        .inputValue(),
    );
    await page.waitForTimeout(200);
    await page
      .getByRole("textbox", {
        name: "Pickup time (HH:MM, 24-hour, India time)",
        exact: true,
      })
      .fill("12:00");
    await page.waitForTimeout(600);
    console.log(
      "Search fields:",
      await page
        .getByLabel("Departure date (YYYY-MM-DD)", { exact: true })
        .inputValue(),
      await page
        .getByLabel("Pickup time (HH:MM, 24-hour, India time)", { exact: true })
        .inputValue(),
    );
    await page.screenshot({
      path: path.join(folder, "premium-search-filled.png"),
    });
    await page
      .getByRole("button", { name: "Find my ride", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View ride & fare", exact: true })
      .first()
      .waitFor({ timeout: 60000 });
    await page.screenshot({
      path: path.join(folder, "premium-results.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "View ride & fare", exact: true })
      .first()
      .click();
    await page.getByText("Your fare, clearly", { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(folder, "premium-listing.png"),
      fullPage: true,
    });
    await page.goto("http://localhost:8093", { waitUntil: "networkidle" });
  }
  for (const [route, name] of [
    ["assistant", "premium-assistant"],
    ["account", "premium-account"],
    ["trips", "premium-trips-gate"],
    ["notifications", "premium-updates-gate"],
    ["safety", "premium-safety"],
  ]) {
    await page.goto("http://localhost:8093/" + route, {
      waitUntil: "networkidle",
    });
    await page.screenshot({
      path: path.join(folder, name + ".png"),
      fullPage: true,
    });
  }
  await page.goto("http://localhost:8093/account", {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Welcome back", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(folder, "premium-login.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("First name", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Back to sign in", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Forgot password", exact: true })
    .click();
  await page.getByText("Forgot password?", { exact: true }).waitFor();
  if (failures.length) throw new Error(failures.join("\n"));
  console.log(
    "Live marketplace Home, search results, listing/fare, account gate, login, registration and reset forms rendered without runtime exceptions. No mutations submitted.",
  );
  await browser.close();
}
main().catch(async (error) => {
  console.error(error.message);
  if (activePage) {
    console.error(
      (await activePage.locator("body").innerText()).slice(0, 2500),
    );
    await activePage.screenshot({
      path: path.resolve(__dirname, "../verification/failure.png"),
      fullPage: true,
    });
  }
  await activeBrowser?.close();
  process.exit(1);
});
