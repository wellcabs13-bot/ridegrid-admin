import { describe, expect, it } from "vitest";

import {
  findLegacyFallbackPage,
  legacyFallbackResponse,
} from "@/lib/website-seo/legacy-migration/fallback";
import { LEGACY_FALLBACK_PAGES } from "@/lib/website-seo/legacy-migration/fallback-data";

describe("W16 legacy cutover fallback", () => {
  it("contains all selected legacy URLs", () => {
    expect(LEGACY_FALLBACK_PAGES).toHaveLength(10);
  });

  it("normalizes trailing slash lookups", () => {
    expect(
      findLegacyFallbackPage(
        "/pune-shirdi-cabs-taxi-car-rentals",
      ),
    ).not.toBeNull();
  });

  it("does not intercept unrelated paths", () => {
    expect(
      findLegacyFallbackPage("/not-a-legacy-page"),
    ).toBeNull();
  });

  it("renders protected legacy page as 200", async () => {
    const response = legacyFallbackResponse(
      "/pune-shirdi-cabs-taxi-car-rentals/",
    );

    expect(response?.status).toBe(200);

    const html = await response!.text();

    expect(html).toContain(
      'data-legacy-fallback="true"',
    );
    expect(html).toContain(
      'meta name="robots" content="index,follow"',
    );
  });

  it("does not render fallback for random URL", () => {
    expect(
      legacyFallbackResponse("/random-url"),
    ).toBeNull();
  });
});