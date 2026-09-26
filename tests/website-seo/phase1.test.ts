// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { phase1Pages, phase1PublicPage, phase1SitemapEntries } from "../../lib/website-public/phase1";
import { normalizePricingOptions, marketplaceResultsHref, locationKey } from "../../lib/website-public/marketplace";
import { publicHref } from "../../lib/website-public/safety";
import { IMAGE_CHECKS, passesImageReview } from "../../lib/website-seo/media/ai-image/quality";
import robots from "../../app/robots";
import aliases from "../../data/seo/phase1-aliases.json";

describe("Phase-1 publication and scope", () => {
  it("renders exactly the supplied records with truthful canonicals and index states", () => {
    expect(phase1Pages).toHaveLength(408);
    for (const record of phase1Pages) {
      const page = phase1PublicPage(record.canonicalUrl)!;
      expect(page).not.toBeNull();
      expect(page.seo.canonical).toBe(`https://www.wellcabs.com${record.canonicalUrl}`);
      expect(page.seo.robots.index).toBe(record.indexState === "READY_INDEX");
      expect(page.seo.schema["@graph"].map(n => n["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
      expect(page.sections.filter(s => s.type === "HERO")).toHaveLength(1);
      for (const link of page.links) expect(publicHref(link.href)).toBe(link.href);
    }
    expect(phase1PublicPage("/routes/invented-to-nowhere-cab")).toBeNull();
  });
  it("excludes noindex pages and aliases from the sitemap", () => {
    const entries = phase1SitemapEntries().map(e => e.url);
    expect(entries.length).toBeGreaterThan(0);
    for (const page of phase1Pages) expect(entries.includes(`https://www.wellcabs.com${page.canonicalUrl}`)).toBe(page.indexState === "READY_INDEX");
    for (const [alias, destination] of Object.entries(aliases)) {
      expect(entries).not.toContain(`https://www.wellcabs.com${alias}`);
      expect(phase1PublicPage(destination)).not.toBeNull();
      expect(aliases).not.toHaveProperty(destination);
    }
  });
  it("has no book-tour or airport form when the service is unsupported", () => {
    for (const p of phase1Pages.filter(p => !p.bookingSupported)) {
      expect(phase1PublicPage(p.canonicalUrl)!.sections.some(s => s.type === "SEARCH")).toBe(false);
      expect(p.capabilityState).toBe("CAPABILITY_LIMITED");
      expect(p.indexState).toBe("READY_INDEX");
    }
  });
  it("allows search crawlers without changing training crawler rules", () => {
    const rule = (robots().rules as { userAgent: string; allow: string; disallow: string[] }[])[0];
    expect(rule.userAgent).toBe("*"); expect(rule.allow).toBe("/");
    for (const p of phase1Pages) expect(rule.disallow.some(prefix => p.canonicalUrl.startsWith(prefix))).toBe(false);
  });
  it("keeps valid pages indexed and in the sitemap independently of empty supply or absent pricing", () => {
    for (const state of ["LIVE_SUPPLY_EMPTY", "PRICING_NOT_CONFIGURED"]) {
      const records = phase1Pages.filter(p => p.supplyState === state);
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.indexState).toBe("READY_INDEX");
        expect(phase1SitemapEntries().some(e => e.url.endsWith(record.canonicalUrl))).toBe(true);
      }
    }
  });
});
describe("central marketplace contract", () => {
  const rate = { rateId: "r1", service: "ROUNDTRIP", city: "Pune", fromCity: "Pune", toCity: "Mumbai", vehicleCategory: "HATCHBACK", packageName: "Pune to Mumbai" };
  it("adapts current public rate-version options and fails closed on unsupported service", () => {
    const rows = normalizePricingOptions([rate, { ...rate, service: "TOURS" }, {}, null]);
    expect(rows).toHaveLength(1); expect(rows[0].tripType).toBe("ROUNDTRIP");
    const url = new URL(marketplaceResultsHref(rows[0], "2026-12-01", "10:00", "HATCHBACK", "2026-12-03"), "https://www.wellcabs.com");
    expect(url.searchParams.get("days")).toBe("3"); expect(url.searchParams.get("endDate")).toBe("2026-12-03");
    expect(url.searchParams.has("price")).toBe(false);
    expect(() => marketplaceResultsHref(rows[0], "2026-12-01", "10:00")).toThrow("return date");
  });
  it("uses current local package names without inventing defaults", () => {
    const [row] = normalizePricingOptions([{ ...rate, service: "LOCAL", packageName: "Configured package" }]);
    const url = new URL(marketplaceResultsHref(row, "2026-12-01", "10:00"), "https://www.wellcabs.com");
    expect(url.searchParams.get("city")).toBe("Pune");
    expect(url.searchParams.get("packageName")).toBe("Configured package");
  });
  it("matches canonical aliases without publishing duplicate entities", () => {
    expect(locationKey("Chhatrapati Sambhajinagar")).toBe(locationKey("Aurangabad"));
    expect(locationKey("Nashik")).toBe(locationKey("Nasik"));
  });
});
describe("automated image approval", () => {
  it("requires every visual criterion, rejecting missing or false checks", () => {
    const pass = { ...Object.fromEntries(IMAGE_CHECKS.map(key => [key, true])), reason: "Reviewed" };
    expect(passesImageReview(pass)).toBe(true);
    for (const key of IMAGE_CHECKS) expect(passesImageReview({ ...pass, [key]: false })).toBe(false);
    expect(passesImageReview({ width: 1536, height: 1024 })).toBe(false);
  });
});
