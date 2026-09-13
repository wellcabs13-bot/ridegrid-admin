// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../../lib/prisma";
import { loadSeoInput } from "../../lib/website-seo/seo/engine/load";
import { loadStoredPublicPage } from "../../lib/website-seo/publishing/stored-public";
import { createSeoPlan } from "../../lib/website-seo/seo/engine/plan";
import { buildContentBrief } from "../../lib/website-seo/content/brief";
import { validateContentQuality } from "../../lib/website-seo/content/quality";
import { w7FixtureContent, w7FixtureMetadata } from "../../scripts/website-seo/w7-test-fixture";
import { entityPath, ENTITY_ROUTES, toPublicPage } from "../../lib/website-public/page-model";
import { publicNavigation } from "../../lib/website-public/navigation";
import { publicBlocks } from "../../lib/website-public/content-blocks";
import { publicMedia } from "../../lib/website-public/media";
import { publicMetadata } from "../../lib/website-public/seo";
import { displayPrice, marketplaceResultsHref, journeyOptions, type PricingOption } from "../../lib/website-public/marketplace";
import { publicHref, jsonLd } from "../../lib/website-public/safety";
import type { WebsitePublicNavigationItem } from "../../lib/website-seo/public-navigation/types";
import type { WebsiteContentBlock } from "../../lib/website-seo/content-blocks/types";
import type { WebsiteMedia } from "../../lib/website-seo/media/types";

vi.mock("../../lib/prisma", () => ({ prisma: { websiteSeoPage: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() } } }));
vi.mock("../../lib/website-seo/seo/engine/load", () => ({ loadSeoInput: vi.fn(), seoObject: (v: unknown) => v && typeof v === "object" && !Array.isArray(v) ? v : {} }));
// All fixtures stay in memory. No database operations, assets, or provider requests.
const revision = new Date("2026-09-12T12:00:00Z");
function fixture() {
  const entity = { id: "e", name: "Temporary Travel", type: "CITY" as const, parentId: null, status: "ACTIVE", metadata: w7FixtureMetadata, updatedAt: revision, keywords: [] };
  const page = { id: "p", entityId: "e", templateId: "t", pathname: "/cities/temporary", status: "PUBLISHED" };
  const sections = [{ id: "overview", type: "OVERVIEW" as const, enabled: true, order: 0 }];
  const keywords = [{ id: "k", entityId: "e", keyword: "Temporary Travel guide", type: "PRIMARY", status: "APPROVED", intent: "INFORMATIONAL" as const, clusterKey: "guide", primaryKeywordId: null }];
  const brief = buildContentBrief({ entity, page, templateId: "t", keywords, sections, links: [] });
  const content = w7FixtureContent();
  const input = { entity, page, brief, content, contentQuality: validateContentQuality(brief, content), editorialApproved: true, keywords, targets: [], baseUrl: "https://example.test" };
  // Generation is only fixture setup, never a public resolver operation.
  const plan = createSeoPlan(input);
  const snapshot = { ...page, updatedAt: revision, entity, template: { id: "t", updatedAt: revision, sections }, metadata: { publishing: { engine: "W7" }, seoW6: { engine: "W6", plan } } };
  return { input, plan, content, snapshot, sections };
}
let f = fixture();
beforeEach(() => {
  vi.clearAllMocks(); f = fixture();
  vi.mocked(prisma.websiteSeoPage.findFirst).mockImplementation(async () => f.snapshot.status === "PUBLISHED" ? f.snapshot : null as never);
  vi.mocked(prisma.websiteSeoPage.findUnique).mockImplementation(async () => f.snapshot as never);
  vi.mocked(prisma.websiteSeoPage.findMany).mockResolvedValue([]);
  vi.mocked(loadSeoInput).mockImplementation(async () => ({ input: f.input, revision }));
});
const model = () => toPublicPage({ status: f.snapshot.status, entityName: f.snapshot.entity.name, entityType: "CITY", pathname: f.snapshot.pathname, readiness: true, plan: f.plan, content: f.content, sections: f.sections });
describe("W14 public website", () => {
  it.each(["DRAFT", "READY", "ARCHIVED"])("rejects %s in the public resolver", async status => { f.snapshot.status = status; expect(await loadStoredPublicPage("/cities/temporary")).toBeNull(); expect(loadSeoInput).not.toHaveBeenCalled(); });
  it("resolves a published page through actual W7/W6 validators", async () => { expect(f.plan.quality.status).toBe("PASS"); const resolved = await loadStoredPublicPage("/cities/temporary"); expect(resolved?.plan).toEqual(f.plan); expect(resolved?.content).toEqual(f.content); });
  it("rejects non-W7 publication ownership", async () => { f.snapshot.metadata.publishing.engine = "MANUAL"; expect(await loadStoredPublicPage("/cities/temporary")).toBeNull(); });
  it("rejects revoked editorial approval and inactive entities", async () => { f.input.editorialApproved = false; expect(await loadStoredPublicPage("/cities/temporary")).toBeNull(); f.input.editorialApproved = true; f.input.entity.status = "INACTIVE"; expect(await loadStoredPublicPage("/cities/temporary")).toBeNull(); });
  it("rejects stored noindex and failed readiness", async () => { f.plan.indexability.indexable = false; expect(await loadStoredPublicPage("/cities/temporary")).toBeNull(); expect(model()).toBeNull(); });
  it("preserves stored SEO metadata", () => { const p = model()!; const metadata = publicMetadata(p.seo); expect(metadata.title).toBe(f.plan.metadata.title); expect(metadata.description).toBe(f.plan.metadata.description); expect(metadata.alternates).toEqual({ canonical: f.plan.canonical.url }); expect(p.seo.schema).toEqual(f.plan.schema); });
  it("does not call generation or persistence in the public adapter", () => {
    for (const file of ["lib/website-seo/publishing/stored-public.ts", "lib/website-public/repository.ts", "lib/website-public/homepage.ts"]) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/createSeoPlan\s*\(|\.generate\s*\(|\.persist\s*\(|\.upsert\s*\(|\.update\s*\(/);
    }
  });
  const nav = (id: string, enabled: boolean, order: number): WebsitePublicNavigationItem => ({ id, label: id, href: "/marketplace", location: "HEADER", linkType: "INTERNAL", enabled, openInNewTab: false, order, createdAt: "2026-09-12", updatedAt: "2026-09-12" });
  it("excludes disabled public navigation", () => expect(publicNavigation([nav("hidden", false, 0), nav("visible", true, 1)], true).map(n => n.label)).toEqual(["visible"]));
  it("sorts navigation and respects external/new-tab settings", () => { const links = publicNavigation([nav("last", true, 9), { ...nav("first", true, 0), href: "https://example.test/", linkType: "EXTERNAL", openInNewTab: true }], true); expect(links.map(n => n.label)).toEqual(["first", "last"]); expect(links[0].newTab).toBe(true); });
  it("does not replace intentionally empty configured navigation", () => expect(publicNavigation([], true)).toEqual([]));
  it("only exposes ACTIVE scoped blocks and preserves placement/category", () => {
    const block: WebsiteContentBlock = { id: "b", key: "private-key", name: "Admin name", status: "ACTIVE", scope: "HOMEPAGE", placement: "BEFORE_CTA", category: "TRUST", order: 0, content: { eyebrow: "", heading: "Information", body: "Saved content", ctaLabel: "", ctaHref: "" }, createdAt: "", updatedAt: "" };
    const result = publicBlocks([block, { ...block, id: "draft", status: "DRAFT" }, { ...block, id: "entity", scope: "GENERATED_PAGES" }], "HOMEPAGE");
    expect(result).toHaveLength(1); expect(result[0].placement).toBe("BEFORE_CTA"); expect(result[0].category).toBe("TRUST"); expect(JSON.stringify(result)).not.toContain("private-key");
  });
  it("omits private fields and raw context from public models", () => {
    Object.assign(f.plan, { apiKey: "secret-value" }); Object.assign(f.plan.metadata, { vendorBankAccount: "secret-value" });
    f.content.sections[0].context = { privateToken: "secret-value", city: "Temporary Travel" };
    const encoded = JSON.stringify(model()); expect(encoded).not.toContain("secret-value"); expect(encoded).not.toContain("vendorBankAccount"); expect(encoded).not.toContain("privateToken"); expect(encoded).toContain("Temporary Travel");
  });
  it("does not fabricate missing pricing", () => { expect(displayPrice(null)).toBeNull(); expect(displayPrice(undefined)).toBeNull(); expect(displayPrice(0)).toBe(0); expect(displayPrice(250)).toBe(250); });
  it("does not create media when absent, inactive or invalid", () => { expect(publicMedia(null)).toBeNull(); expect(publicMedia({ status: "DRAFT" } as WebsiteMedia)).toBeNull(); });
  it("projects only an actual ACTIVE FileAsset image", () => {
    const media = { status: "ACTIVE", altText: "Road through the hills", mimeType: "image/jpeg", fileUrl: "/api/files/actual-asset", caption: "", storageKey: "private/path" } as unknown as WebsiteMedia;
    expect(publicMedia(media)).toEqual({ src: "/api/files/actual-asset", alt: "Road through the hills", caption: "" });
    expect(publicMedia({ ...media, fileUrl: "javascript:alert(1)" })).toBeNull();
  });
  it.each(Object.entries(ENTITY_ROUTES))("maps the %s entity route", (type, prefix) => expect(entityPath(type, "saved-slug")).toBe(`/${prefix}/saved-slug`));
  it("rejects unsafe links and keeps home navigation on the live root", () => { expect(publicHref("javascript:alert(1)")).toBeNull(); expect(publicHref("/\\evil.test")).toBeNull(); expect(publicHref("/api/vendors")).toBeNull(); expect(publicHref("/")).toBe("/"); });
  it("escapes script-breaking structured data", () => expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("<"));
  it("uses the existing results contract with real journey options", () => {
    const o: PricingOption = { id: "real-package", pricingType: "OUTSTATION", tripType: "ROUNDTRIP", vehicleCategory: "SEDAN", packageName: "Saved route", city: null, fromCity: "Pune", toCity: "Nashik", airportName: null, transferDirection: null, includedKm: null };
    expect(journeyOptions([o], 0)).toEqual([]); expect(journeyOptions([o], 1)).toEqual([o]);
    const url = new URL(marketplaceResultsHref(o, "2026-10-01", "10:30"), "https://example.test"); expect(url.pathname).toBe("/marketplace/results"); expect(url.searchParams.get("pickupCity")).toBe("Pune"); expect(url.searchParams.get("tripType")).toBe("ROUNDTRIP"); expect(url.searchParams.has("price")).toBe(false);
  });
});
