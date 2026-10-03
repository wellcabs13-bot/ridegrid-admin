// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSeoPlan } from "../../lib/website-seo/seo/engine/plan";
import { buildContentBrief } from "../../lib/website-seo/content/brief";
import { validateContentQuality } from "../../lib/website-seo/content/quality";
import { resolveSeoCanonical } from "../../lib/website-seo/seo/canonical";
import { publicationReadiness } from "../../lib/website-seo/publishing/readiness";
import { publicationDiscovery, publicationSitemapEntry } from "../../lib/website-seo/publishing/discovery";
import { generateSitemapDocuments, escapeXml } from "../../lib/website-seo/publishing/sitemap";
import { localIndexingProvider, searchConsoleDiscoveryProvider } from "../../lib/website-seo/publishing/providers";
import { localSearchConsoleProvider } from "../../lib/website-seo/publishing/search-console";
import { publicationProtected } from "../../lib/website-seo/publishing/repository";
import { WEBSITE_ENTITY_TYPES } from "../../lib/website-seo/entities/types";
import { w7FixtureContent, w7FixtureMetadata } from "../../scripts/website-seo/w7-test-fixture";

function plan() {
  const entity = { id: "e", name: "Temporary Travel", type: "CITY" as const, parentId: null, status: "ACTIVE", metadata: w7FixtureMetadata };
  const page = { id: "p", entityId: "e", templateId: "t", pathname: "/cities/temporary", status: "PUBLISHED" };
  const keywords = [{ id: "k", entityId: "e", keyword: "Temporary Travel guide", type: "PRIMARY", status: "APPROVED", intent: "INFORMATIONAL" as const,
    clusterKey: "guide", primaryKeywordId: null }];
  const brief = buildContentBrief({ entity, page, templateId: "t", keywords, sections: [{ id: "overview", type: "OVERVIEW", enabled: true, order: 0 }], links: [] });
  const content = w7FixtureContent();
  return createSeoPlan({ entity, page, brief, content, contentQuality: validateContentQuality(brief, content), editorialApproved: true, keywords, targets: [], baseUrl: "https://example.test" });
}
describe("W7 publishing", () => {
  it.each(WEBSITE_ENTITY_TYPES)("uses one readiness model for %s", type => {
    const p = plan(); p.entity.type = type;
    expect(publicationReadiness("READY", p, { exists: true, indexable: true }).ready).toBe(true);
  });
  it.each(["DRAFT", "ARCHIVED"])("blocks lifecycle %s", status => expect(publicationReadiness(status, plan(), { exists: true, indexable: true }).ready).toBe(false));
  it("blocks noindex, incomplete and protected pages", () => {
    expect(publicationReadiness("READY", plan(), { exists: false, indexable: false }).ready).toBe(false);
    expect(publicationReadiness("READY", plan(), { exists: true, indexable: false }).ready).toBe(false);
    expect(publicationReadiness("READY", plan(), { exists: true, indexable: true }, true).ready).toBe(false);
    const p = plan(); p.indexability.indexable = false;
    expect(publicationReadiness("READY", p, { exists: true, indexable: true }).ready).toBe(false);
  });
  it("preserves manual ownership signals", () => {
    expect(publicationProtected({ publishing: { owner: "human" } })).toBe(true);
    expect(publicationProtected({ publishing: { engine: "W7" }, contentW5: { editorialStatus: "APPROVED" } })).toBe(false);
  });
  it("resolves deterministic relative URLs without a fabricated domain", () => {
    expect(resolveSeoCanonical("/cities/temporary/?utm_source=test")).toEqual(resolveSeoCanonical("/cities/temporary"));
    expect(resolveSeoCanonical("/cities/temporary").url).toBeNull();
  });
  it("includes only eligible published entries, independently of external indexing", () => {
    const p = plan(); expect(publicationSitemapEntry(publicationDiscovery("PUBLISHED", p))?.url).toContain("/cities/temporary");
    expect(publicationSitemapEntry(publicationDiscovery("DRAFT", p))).toBeNull();
    p.indexability.indexable = false;
    expect(publicationSitemapEntry(publicationDiscovery("PUBLISHED", p))).toBeNull();
  });
  it("sorts, escapes, deduplicates and chunks sitemap documents", () => {
    const entries = [{ url: "https://example.test/cities/b&c" }, { url: "https://example.test/cities/a" }, { url: "https://example.test/cities/a" }];
    const result = generateSitemapDocuments(entries, "https://example.test/api/website-seo/sitemap", 1);
    expect(result.count).toBe(2); expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]).toContain("/cities/a"); expect(result.chunks[1]).toContain("b&amp;c");
    expect(result.document).toContain("<sitemapindex"); expect(result.document).toContain("?chunk=1");
    expect(generateSitemapDocuments([...entries].reverse(), "https://example.test/api/website-seo/sitemap", 1)).toEqual(result);
    expect(escapeXml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&apos;");
  });
  it("rejects invalid sitemap URLs and sizes", () => {
    expect(() => generateSitemapDocuments([{ url: "https://example.test/a?track=x" }], null)).toThrow();
    expect(() => generateSitemapDocuments([], null, 0)).toThrow();
    expect(generateSitemapDocuments([], null).document).toContain("<urlset");
  });
  it("keeps local external state UNKNOWN without credentials or Google calls", async () => {
    const request = { pageId: "p", url: "https://example.test/cities/a", sitemapUrl: "https://example.test/sitemap", idempotencyKey: "k" };
    const result = await localIndexingProvider.submitDiscovery(request);
    expect(result.requestState).toBe("NOT_SENT"); expect(result.external.coverage).toBe("UNKNOWN"); expect(result.external.observedAt).toBeNull();
    expect(await localIndexingProvider.submitDiscovery(request)).toEqual(result);
    expect((await localSearchConsoleProvider.inspect(request.url)).crawl).toBe("UNKNOWN");
    expect((await localIndexingProvider.getStatus(request.url)).external.coverage).toBe("UNKNOWN");
  });
  it("sitemap acceptance never implies indexing", async () => {
    const adapter = searchConsoleDiscoveryProvider({ ...localSearchConsoleProvider, async notifySitemap() { return { accepted: true }; } }, "test");
    const result = await adapter.submitDiscovery({ pageId: "p", url: "https://example.test/a", sitemapUrl: "https://example.test/sitemap", idempotencyKey: "k" });
    expect(result.requestState).toBe("ACCEPTED"); expect(result.external.coverage).toBe("UNKNOWN");
  });
});
