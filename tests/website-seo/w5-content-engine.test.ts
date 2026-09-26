// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildContentBrief } from "../../lib/website-seo/content/brief";
import { generateContentDraft } from "../../lib/website-seo/content/engine";
import { validateContentQuality } from "../../lib/website-seo/content/quality";
import { parseGeneratedContent } from "../../lib/website-seo/content/generation/validate";
import { localContentProvider, adaptWebsiteSeoAI } from "../../lib/website-seo/content/providers";
import { generateContentFAQs } from "../../lib/website-seo/content/faq";
import { suggestContentLinks } from "../../lib/website-seo/content/mapping";
import { WEBSITE_ENTITY_TYPES } from "../../lib/website-seo/entities/types";
import { WEBSITE_TEMPLATE_SECTION_TYPES } from "../../lib/website-seo/templates/types";
import type { ContentKeyword, ContentEntity } from "../../lib/website-seo/content/types";

const entity: ContentEntity = { id: "e", name: "Alpha", type: "CITY", parentId: "parent", metadata: { city: "Alpha", fakePrice: 200 } };
const primary: ContentKeyword = { id: "k", entityId: "e", keyword: "Alpha cab", type: "PRIMARY", intent: "TRANSACTIONAL",
  status: "APPROVED", clusterKey: "booking", primaryKeywordId: null };
function brief() {
  return buildContentBrief({ entity, page: null, templateId: "t", links: [], keywords: [primary,
    { ...primary, id: "s", type: "SECONDARY", primaryKeywordId: "k", keyword: "Alpha taxi" }],
  sections: WEBSITE_TEMPLATE_SECTION_TYPES.map((type, order) => ({ id: type, type, order, enabled: true })) });
}

describe("W5 content engine", () => {
  it("retains entity, keyword relationships and intent without copying metrics or untrusted facts", () => {
    const b = brief();
    expect(b.entity.id).toBe("e"); expect(b.primaryKeyword?.id).toBe("k");
    expect(b.supportingKeywords[0].keyword).toBe("Alpha taxi");
    expect(b.searchIntent).toBe("TRANSACTIONAL"); expect(b.clusterKey).toBe("booking");
    expect(b.context).toEqual({ city: "Alpha" });
    expect(JSON.stringify(b)).not.toContain("fakePrice");
  });
  it("excludes wrong-entity and rejected keywords", () => {
    const b = buildContentBrief({ entity, page: null, templateId: "t", links: [], sections: [],
      keywords: [{ ...primary, entityId: "other" }, { ...primary, status: "REJECTED" }] });
    expect(b.primaryKeyword).toBeNull(); expect(b.supportingKeywords).toEqual([]);
  });
  it.each(WEBSITE_ENTITY_TYPES)("generates deterministic structured %s drafts", async type => {
    const b = brief(); b.entity.type = type;
    const a = await generateContentDraft(b);
    expect(await generateContentDraft(b)).toEqual(a);
    expect(a.sections.map(s => s.type)).toEqual(WEBSITE_TEMPLATE_SECTION_TYPES);
    expect(a.seoCandidates.title).toContain("Alpha"); expect(a.seoCandidates.metaDescription.length).toBeGreaterThan(50);
    expect(a.quality.issues).toEqual([]);
    expect(a.quality.score).toBeGreaterThanOrEqual(0); expect(a.quality.score).toBeLessThanOrEqual(100);
    expect(JSON.stringify(a)).not.toMatch(/searchVolume|difficulty|cpc|competition/);
    for (const s of a.sections.filter(s => s.binding)) {
      expect(s.paragraphs).toEqual([]); expect(s.binding?.entityId).toBe("e");
    }
  });
  it("respects disabled sections and does not emit FAQ outside its template", async () => {
    const b = brief(); b.recommendedSections = b.recommendedSections.filter(s => s.type === "HERO");
    const draft = await generateContentDraft(b);
    expect(draft.sections).toHaveLength(1); expect(draft.faq).toEqual([]);
  });
  it("deduplicates semantic FAQ variants", () => {
    const b = brief(); b.questions = ["What is Alpha cab fare?", "What is Alpha cab price?", "How to book Alpha cab?", "HOW TO BOOK ALPHA CAB?"];
    expect(generateContentFAQs(b)).toHaveLength(2);
  });
  it("suggests only real published related pages", () => {
    const page = { id: "p", entityId: "parent", pathname: "/parent", templateId: "t", status: "PUBLISHED" };
    const links = suggestContentLinks(entity, [{ entity: { ...entity, id: "parent", parentId: null }, page },
      { entity: { ...entity, id: "unrelated", parentId: null }, page: { ...page, entityId: "unrelated", id: "u" } }]);
    expect(links).toHaveLength(1); expect(links[0].relationship).toBe("PARENT");
    expect(suggestContentLinks(entity, [{ entity: { ...entity, id: "parent" }, page: { ...page, status: "DRAFT" } }])).toEqual([]);
  });
  it.each(["Only ₹500 per trip", "It takes 2 hours", "The route is 30 km", "We have 12 cars", "Rated 4.9 stars",
    "Five star service", "Cars are available", "Our fleet is ready", "The cheapest cab", "Guaranteed pickup", "Award-winning service"])(
    "blocks unsupported claim: %s", async claim => {
      const b = brief(); const draft = await generateContentDraft(b);
      draft.sections.find(s => s.type === "OVERVIEW")!.paragraphs.push(claim);
      expect(validateContentQuality(b, draft).status).toBe("BLOCKED");
    });
  it("detects stuffing, thin content, duplicated FAQs/headings/paragraphs and scale duplication", async () => {
    const b = brief(); const draft = await generateContentDraft(b);
    draft.sections.find(s => s.type === "OVERVIEW")!.paragraphs = ["Alpha cab ".repeat(30), "repeat", "repeat"];
    draft.sections[1].heading = draft.sections[0].heading;
    const faq = draft.sections.find(s => s.type === "FAQ")!;
    faq.faqs.push(faq.faqs[0]);
    const q = validateContentQuality(b, draft, true);
    expect(q.issues.map(i => i.code)).toEqual(expect.arrayContaining(["KEYWORD_STUFFING", "DUPLICATE_FAQ", "DUPLICATE_CONTENT"]));
    expect(q.warnings.map(i => i.code)).toEqual(expect.arrayContaining(["DUPLICATE_HEADINGS", "REPETITIVE_TEXT"]));
    draft.sections = [];
    expect(validateContentQuality(b, draft).warnings.map(i => i.code)).toContain("THIN_CONTENT");
    expect(validateContentQuality(b, draft).issues.map(i => i.code)).toContain("MISSING_SECTIONS");
  });
  it("rejects malformed provider data and invented links", async () => {
    expect(() => parseGeneratedContent({ sections: "HTML" })).toThrow();
    const b = brief(); const draft = await generateContentDraft(b);
    draft.sections[0].links = [{ pageId: "fake", entityId: "fake", label: "fake", pathname: "/fake", relationship: "CHILD" }];
    expect(validateContentQuality(b, draft).issues.map(i => i.code)).toContain("UNSUPPORTED_LINK");
  });
  it("adapts the existing AI interface and validates its output without API keys", async () => {
    const b = brief(); const data = await localContentProvider.generate(b);
    const adapter = adaptWebsiteSeoAI({ generate: async () => ({ success: true, content: JSON.stringify(data) }) }, "test-adapter");
    expect((await generateContentDraft(b, adapter)).sections).toEqual((await generateContentDraft(b)).sections);
    await expect(generateContentDraft(b, { id: "bad", generate: async () => ({ html: "bad" }) })).rejects.toThrow();
  });
});
