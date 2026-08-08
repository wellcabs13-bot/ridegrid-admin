import {
  test,
  expect,
} from "@playwright/test";

test.describe(
  "RideGrid Application",
  () => {
    test(
      "application loads",
      async ({ page }) => {
        await page.goto("/");

        await expect(
          page
        ).toHaveTitle(
          /RideGrid/i
        );
      }
    );
  }
);