// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSeoPlan } from "../../lib/website-seo/seo/engine/plan";
import { resolveSeoCanonical, normalizeSeoPath } from "../../lib/website-seo/seo/canonical";
import { validateSeoQuality } from "../../lib/website-seo/seo/quality";
import { validateContentQuality } from "../../lib/website-seo/content/quality";
import { buildContentBrief } from "../../lib/website-seo/content/brief";
import { WEBSITE_ENTITY_TYPES } from "../../lib/website-seo/entities/types";
import type { SeoInput } from "../../lib/website-seo/seo/types";

function fixture(): SeoInput {
  const entity = { id: "e", type: "CITY" as const, name: "Alpha", parentId: "parent", status: "ACTIVE",
    metadata: { fromCity: "Alpha", toCity: "Beta" } };
  const page = { id: "p", entityId: "e", pathname: "/cities/alpha", templateId: "t", status: "READY" };
  const keyword = { id: "k", entityId: "e", keyword: "Alpha travel planning", type: "PRIMARY", intent: "INFORMATIONAL" as const,
    status: "APPROVED", clusterKey: "planning", primaryKeywordId: null };
  const target = { entity: { ...entity, id: "parent", name: "Region", parentId: null },
    page: { ...page, id: "parent-page", entityId: "parent", pathname: "/regions/region", status: "PUBLISHED" } };
  const brief = buildContentBrief({ entity, page, templateId: "t", keywords: [keyword],
    sections: [{ id: "overview", type: "OVERVIEW", order: 0, enabled: true }, { id: "faq", type: "FAQ", order: 1, enabled: true }],
    links: [{ entityId: "parent", pageId: "parent-page", pathname: target.page.pathname, label: "Region", relationship: "PARENT" }] });
  const content = { pageTitle: keyword.keyword,
    seoCandidates: { title: "Alpha travel planning | RideGrid", metaDescription: "Plan your Alpha journey with useful pickup and destination details. Review the trip information and prepare your itinerary before booking." },
    sections: [{ id: "overview", type: "OVERVIEW" as const, heading: "Planning your Alpha journey",
      paragraphs: ["Begin planning by writing down your pickup address and the destination you intend to visit. Include landmarks that make the pickup point easier to identify and check the address before searching. Think about who is travelling with you and whether luggage or other passenger requirements may affect your choice. Keep these details with your itinerary so that you can review them when comparing trip information. Read the terms attached to an option carefully, including the pickup instructions and the process for changing your plans. If your itinerary includes a connection, check its details independently and allow room to review your arrangements. This guide is a planning aid rather than a quote or a confirmation of a particular vehicle. Consult current booking information before deciding how to proceed. Keep your destination details accessible during the planning process and confirm any uncertain information with the relevant service. Clear trip details help you assess whether the information shown is relevant to your intended journey."],
      benefits: [], context: brief.context, faqs: [], links: [], binding: null, cta: null },
    { id: "faq", type: "FAQ" as const, heading: "Planning questions", paragraphs: [], benefits: [], context: {}, links: [], binding: null, cta: null,
      faqs: [{ question: "What should I prepare for Alpha travel planning?", answer: "Keep the pickup address, destination and passenger requirements with your itinerary.", binding: null }] }] };
  return { entity, page, brief, content, contentQuality: validateContentQuality(brief, content), editorialApproved: true,
    keywords: [keyword], targets: [target], baseUrl: "https://example.test" };
}

describe("W6 Central SEO Engine", () => {
  it.each(WEBSITE_ENTITY_TYPES)("supports %s with stable metadata, W4 alignment and reused W5 candidates", type => {
    const input = fixture(); input.entity.type = type; input.brief.entity.type = type;
    const plan = createSeoPlan(input);
    expect(input.contentQuality?.status).toBe("PASS");
    expect(plan).toEqual(createSeoPlan(input));
    expect(plan.entity.type).toBe(type); expect(plan.page.id).toBe(input.page.id);
    expect(plan.metadata.title).toBe(input.content?.seoCandidates.title);
    expect(plan.metadata.description).toBe(input.content?.seoCandidates.metaDescription);
    expect(plan.metadata.primaryKeyword).toBe("Alpha travel planning");
    expect(plan.quality.status).toBe("PASS"); expect(plan.indexability.indexable).toBe(true);
    expect(plan.sitemapEligibility.eligible).toBe(false);
  });
  it.each(["/cities/alpha/", "/cities/alpha?utm_source=ad#top", "/cities//alpha", "/cities/%61lpha"])("normalizes canonical variant %s", path => {
    expect(resolveSeoCanonical(path, "https://example.test").url).toBe("https://example.test/cities/alpha");
  });
  it.each(["//evil.test/path", "https://evil.test", "/a/../b", "/a/%2e%2e/b", "/a/%2fb", "/a\\b", "/bad%", "/a%20b"])("rejects invalid canonical %s", path => {
    expect(resolveSeoCanonical(path).kind).toBe("INVALID");
  });
  it("keeps relative canonicals without a fake domain and handles slash policy", () => {
    expect(resolveSeoCanonical("/alpha/")).toEqual({ kind: "RELATIVE", path: "/alpha", url: null, reasonCodes: ["SITE_ORIGIN_NOT_CONFIGURED"] });
    expect(normalizeSeoPath("/alpha", true)).toBe("/alpha/"); expect(normalizeSeoPath("/file.pdf", true)).toBe("/file.pdf");
    expect(resolveSeoCanonical("/alpha", "https://example.test/subpath").kind).toBe("INVALID");
  });
  it.each(["DRAFT", "ARCHIVED"])("noindexes %s pages", status => {
    const input = fixture(); input.page.status = status;
    expect(createSeoPlan(input).indexability.reasonCodes).toContain("PAGE_NOT_READY");
  });
  it("noindexes missing, thin, duplicate, unapproved, inactive or relative-origin content", () => {
    const inputs = [fixture(), fixture(), fixture(), fixture(), fixture(), fixture()];
    inputs[0].content = null; inputs[1].contentQuality!.status = "REVIEW"; inputs[2].canonicalConflict = true;
    inputs[3].editorialApproved = false; inputs[4].entity.status = "INACTIVE"; inputs[5].baseUrl = undefined;
    for (const input of inputs) {
      const plan = createSeoPlan(input);
      expect(plan.indexability.indexable).toBe(false); expect(plan.sitemapEligibility.eligible).toBe(false);
    }
  });
  it("allows sitemap eligibility only for published, indexable pages", () => {
    const input = fixture(); input.page.status = "PUBLISHED";
    expect(createSeoPlan(input).sitemapEligibility.eligible).toBe(true);
    input.duplicateDescription = true;
    expect(createSeoPlan(input).sitemapEligibility.eligible).toBe(false);
  });
  it("creates safe WebPage, real breadcrumb and FAQ schema without commercial claims", () => {
    const plan = createSeoPlan(fixture());
    expect(plan.schema["@graph"].map(n => n["@type"])).toEqual(["WebPage", "BreadcrumbList", "FAQPage"]);
    expect(JSON.stringify(plan.schema)).not.toMatch(/aggregateRating|reviewCount|offers|price|availability|award/);
    expect(new Set(plan.schema["@graph"].map(n => n["@id"])).size).toBe(3);
  });
  it("omits FAQ with missing answers or unresolved bindings and breadcrumb without real parent", () => {
    const input = fixture(); input.targets = [];
    input.content!.sections[1].faqs[0].answer = "";
    expect(createSeoPlan(input).schema["@graph"].some(n => n["@type"] === "FAQPage")).toBe(false);
    input.content!.sections[1].faqs[0].answer = "Check current trip information.";
    input.content!.sections[1].faqs[0].binding = { resource: "SEARCH", entityId: "e", state: "REQUIRES_LIVE_RESOLUTION" };
    expect(createSeoPlan(input).schema["@graph"].some(n => n["@type"] === "FAQPage")).toBe(false);
  });
  it("selects only existing related published targets without self/duplicate links", () => {
    const input = fixture(); input.targets.push(input.targets[0], { entity: input.entity, page: input.page });
    const plan = createSeoPlan(input);
    expect(plan.internalLinks).toHaveLength(1);
    expect(plan.internalLinks[0].pageId).toBe("parent-page");
    input.targets.reverse(); expect(createSeoPlan(input).internalLinks).toEqual(plan.internalLinks);
    input.targets = []; expect(createSeoPlan(input).internalLinks).toEqual([]);
  });
  it("does not trust stale W5 PASS flags for numeric claims or schema", () => {
    const input = fixture(); input.content!.sections[1].faqs[0].answer = "The fare is ₹100 with guaranteed pickup.";
    const plan = createSeoPlan(input);
    expect(plan.schema["@graph"]).toEqual([]);
    expect(plan.indexability.indexable).toBe(false);
    expect(plan.quality.issues.some(i => i.code === "CONTENT_QUALITY")).toBe(true);
  });
  it("rejects redirect-to-self and detectable chain/loop, never inventing history", () => {
    const input = fixture(); expect(createSeoPlan(input).redirectSignals.recommendations).toEqual([]);
    input.historicalPaths = ["/old", "/old", "/cities/alpha"];
    let result = createSeoPlan(input).redirectSignals;
    expect(result.recommendations).toHaveLength(1); expect(result.recommendations[0].status).toBe(308);
    expect(result.rejected[0].reason).toBe("REDIRECT_TO_SELF");
    input.existingRedirects = [{ from: "/cities/alpha", to: "/old" }];
    result = createSeoPlan(input).redirectSignals;
    expect(result.recommendations).toEqual([]);
    expect(result.rejected.some(r => r.reason === "TARGET_REDIRECTS_CHAIN_OR_LOOP")).toBe(true);
  });
  it("reports stuffing, duplicates and length without truncating copy", () => {
    const input = fixture(); input.content!.seoCandidates.title = "Alpha travel planning ".repeat(8).trim();
    input.duplicateTitle = true;
    const plan = createSeoPlan(input);
    expect(plan.metadata.title).toBe(input.content!.seoCandidates.title);
    expect(plan.quality.issues.map(i => i.code)).toContain("KEYWORD_STUFFING");
    expect(plan.quality.issues.map(i => i.code)).toContain("DUPLICATE_TITLE");
    expect(plan.quality.score).toBeGreaterThanOrEqual(0); expect(plan.quality.score).toBeLessThanOrEqual(100);
  });
  it("detects mutated canonical, schema, links and sitemap inconsistency", () => {
    const input = fixture(); const plan = createSeoPlan(input);
    plan.canonical.url = "https://example.test/nonexistent";
    plan.schema["@graph"].push(plan.schema["@graph"][0]);
    plan.internalLinks.push({ entityId: "e", pageId: "p", path: "/cities/alpha", anchor: "Alpha", reason: "CHILD" });
    plan.sitemapEligibility.eligible = true;
    expect(validateSeoQuality(input, plan).issues.map(i => i.code)).toEqual(expect.arrayContaining([
      "CANONICAL_INVALID", "SCHEMA_INVALID", "LINK_INVALID", "SITEMAP_CONFLICT",
    ]));
  });
});
