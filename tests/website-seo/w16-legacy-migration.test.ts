import {
  describe,
  expect,
  it,
} from "vitest";

import { VERIFIED_LEGACY_SEED } from "@/lib/website-seo/legacy-migration/seed";
import type { LegacyMigrationEntry } from "@/lib/website-seo/legacy-migration/types";
import {
  isReservedLegacySource,
  normalizeLegacyPath,
  resolveLegacyActionFromEntries,
  validateLegacyEntries,
} from "@/lib/website-seo/legacy-migration/validation";

function entry(
  values: Partial<LegacyMigrationEntry> = {},
): LegacyMigrationEntry {
  return {
    id: "1",
    label: "Legacy page",
    sourcePath: "/old-page/",
    targetPath: "/routes/new-page",
    strategy: "REDIRECT",
    status: "PLANNED",
    priority: "HIGH",
    category: "ROUTE",
    notes: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...values,
  };
}

describe("W16 legacy SEO migration", () => {
  it("normalizes legacy paths", () => {
    expect(
      normalizeLegacyPath("/old-page/"),
    ).toBe("/old-page");
  });

  it("rejects external URLs", () => {
    expect(
      normalizeLegacyPath(
        "https://example.com/old-page",
      ),
    ).toBeNull();
  });

  it("rejects query-bearing source paths", () => {
    expect(
      normalizeLegacyPath("/old-page?x=1"),
    ).toBeNull();
  });

  it("protects admin and API routes", () => {
    expect(
      isReservedLegacySource("/admin"),
    ).toBe(true);

    expect(
      isReservedLegacySource("/api/test"),
    ).toBe(true);
  });

  it("rejects duplicate sources", () => {
    const errors = validateLegacyEntries([
      entry({ id: "1" }),
      entry({ id: "2" }),
    ]);

    expect(
      errors.some((value) =>
        value.includes("duplicate source"),
      ),
    ).toBe(true);
  });

  it("rejects redirect to self", () => {
    const errors = validateLegacyEntries([
      entry({
        targetPath: "/old-page/",
      }),
    ]);

    expect(
      errors.some((value) =>
        value.includes("redirect to self"),
      ),
    ).toBe(true);
  });

  it("does not execute planned redirects", () => {
    expect(
      resolveLegacyActionFromEntries(
        [entry()],
        "/old-page/",
      ),
    ).toBeNull();
  });

  it("executes active redirect as 308", () => {
    expect(
      resolveLegacyActionFromEntries(
        [
          entry({
            status: "ACTIVE",
          }),
        ],
        "/old-page/",
      ),
    ).toEqual({
      kind: "REDIRECT",
      from: "/old-page",
      to: "/routes/new-page",
      status: 308,
    });
  });

  it("supports explicit 410 retirement", () => {
    expect(
      resolveLegacyActionFromEntries(
        [
          entry({
            strategy: "RETIRE",
            targetPath: null,
            status: "ACTIVE",
          }),
        ],
        "/old-page/",
      ),
    ).toEqual({
      kind: "RETIRE",
      path: "/old-page",
      status: 410,
    });
  });

  it("rejects active redirect chains", () => {
    const errors = validateLegacyEntries([
      entry({
        id: "1",
        sourcePath: "/a",
        targetPath: "/b",
        status: "ACTIVE",
      }),
      entry({
        id: "2",
        sourcePath: "/b",
        targetPath: "/c",
        status: "ACTIVE",
      }),
    ]);

    expect(
      errors.some((value) =>
        value.includes("chain"),
      ),
    ).toBe(true);
  });

  it("rejects active guide before guide publishing exists", () => {
    const errors = validateLegacyEntries([
      entry({
        strategy: "GUIDE",
        status: "ACTIVE",
      }),
    ]);

    expect(
      errors.some((value) =>
        value.includes("guide cannot activate"),
      ),
    ).toBe(true);
  });

  it("ships only verified legacy seed entries", () => {
    expect(
      VERIFIED_LEGACY_SEED.length,
    ).toBeGreaterThanOrEqual(10);

    expect(
      VERIFIED_LEGACY_SEED.every(
        (item) =>
          item.sourcePath.startsWith("/") &&
          item.priority,
      ),
    ).toBe(true);
  });

  it("does not activate seeded entries automatically", () => {
    expect(
      VERIFIED_LEGACY_SEED.some(
        (item: any) =>
          item.status === "ACTIVE",
      ),
    ).toBe(false);
  });
});