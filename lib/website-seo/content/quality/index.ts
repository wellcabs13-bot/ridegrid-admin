import { createHash } from "node:crypto";
import { normalizeWebsiteKeyword } from "../../keywords/normalize";
import type { ContentBrief, ContentQuality, GeneratedContent } from "../types";

export function contentText(content: GeneratedContent): string[] {
  return [content.pageTitle, content.seoCandidates.title, content.seoCandidates.metaDescription,
    ...content.sections.flatMap(s => [s.heading, ...s.paragraphs, ...s.benefits, ...Object.values(s.context),
      ...s.faqs.flatMap(f => [f.question, f.answer]), ...s.links.map(l => l.label), s.cta?.label ?? ""])].filter(Boolean);
}
export const contentFingerprint = (content: GeneratedContent): string =>
  createHash("sha256").update(JSON.stringify(content)).digest("hex");
export function copyFingerprint(content: GeneratedContent): string {
  return createHash("sha256").update(contentText(content).map(normalizeWebsiteKeyword).join("\n")).digest("hex");
}

export function validateContentQuality(brief: ContentBrief, content: GeneratedContent,
  duplicateCopy = false): ContentQuality {
  const issues: ContentQuality["issues"] = [];
  const warnings: ContentQuality["warnings"] = [];
  const issue = (code: string, message: string) => { issues.push({ code, message }); };
  const warn = (code: string, message: string) => { warnings.push({ code, message }); };
  const text = contentText(content).join(" ");
  const normalized = normalizeWebsiteKeyword(text);
  const expected = new Map(brief.recommendedSections.map(s => [s.id, s.type]));
  const ids = new Set<string>();
  for (const section of content.sections) {
    if (ids.has(section.id) || expected.get(section.id) !== section.type) issue("TEMPLATE_MISMATCH", "Unsupported or duplicate section.");
    ids.add(section.id);
    if (!section.heading.trim()) issue("EMPTY_HEADING", "A section heading is empty.");
    if (!section.paragraphs.some(p => p.trim()) && !section.binding && !section.faqs.length && !section.links.length && !section.cta) {
      warn("EMPTY_SECTION", `Section ${section.id} needs source material or related pages.`);
    }
    const live = ["SEARCH", "MARKETPLACE", "PRICING", "VEHICLES", "REVIEWS", "TRUST"].includes(section.type);
    if (live && (section.binding?.resource !== section.type || section.paragraphs.length || section.benefits.length ||
      section.faqs.length || Object.keys(section.context).length || section.links.length || section.cta)) {
      issue("LIVE_DATA_REQUIRED", "Live-data sections must contain a reference, not static business content.");
    }
    if (section.binding && (!live || section.binding.entityId !== brief.entity.id)) issue("INVALID_BINDING", "Binding does not match the section/entity.");
    for (const faq of section.faqs) {
      if (section.type !== "FAQ" || !faq.question.trim() || !faq.answer.trim()) issue("INVALID_FAQ", "FAQ content is empty or outside an FAQ section.");
      if (faq.binding && faq.binding.entityId !== brief.entity.id) issue("INVALID_BINDING", "FAQ binding points to another entity.");
    }
    for (const [key, value] of Object.entries(section.context)) {
      if (brief.context[key] !== value) issue("UNSUPPORTED_CONTEXT", "Context is not present in the source brief.");
    }
    for (const link of section.links) {
      if (!brief.internalLinks.some(l => JSON.stringify(l) === JSON.stringify(link))) issue("UNSUPPORTED_LINK", "Link is not an approved source suggestion.");
    }
    if (section.cta && (section.type !== "CTA" || section.cta.intent !== brief.ctaIntent)) issue("INVALID_CTA", "CTA does not match the brief.");
  }
  if ([...expected.keys()].some(id => !ids.has(id))) issue("MISSING_SECTIONS", "Required enabled template sections are missing.");
  if (!content.pageTitle.trim() || !content.seoCandidates.title.trim() || !content.seoCandidates.metaDescription.trim() || !content.sections.length) {
    issue("EMPTY_CONTENT", "Page content or SEO candidates are empty.");
  }
  if (!normalized.includes(normalizeWebsiteKeyword(brief.entity.name))) issue("ENTITY_RELEVANCE", "Entity identity is absent.");
  const primary = normalizeWebsiteKeyword(brief.primaryKeyword?.keyword ?? "");
  if (primary && !normalized.includes(primary)) warn("PRIMARY_RELEVANCE", "Primary keyword is not naturally covered.");
  // Inspect body copy separately so title/meta/hero repetition does not inflate stuffing signals.
  const body = normalizeWebsiteKeyword(content.sections.flatMap(s => [...s.paragraphs, ...s.benefits,
    ...s.faqs.flatMap(f => [f.question, f.answer])]).join(" "));
  for (const keyword of [brief.primaryKeyword, ...brief.supportingKeywords].filter(k => k !== null)) {
    const phrase = normalizeWebsiteKeyword(keyword.keyword);
    if (phrase.length < 2) continue;
    const occurrences = body.split(phrase).length - 1;
    if (occurrences >= 4 && occurrences * phrase.split(" ").length / Math.max(1, body.split(" ").length) > 0.08) {
      issue("KEYWORD_STUFFING", "Keyword repetition exceeds natural coverage."); break;
    }
  }
  const headings = content.sections.map(s => normalizeWebsiteKeyword(s.heading)).filter(Boolean);
  if (new Set(headings).size !== headings.length) warn("DUPLICATE_HEADINGS", "Section headings repeat.");
  const paragraphs = content.sections.flatMap(s => s.paragraphs).map(normalizeWebsiteKeyword).filter(Boolean);
  if (new Set(paragraphs).size !== paragraphs.length) warn("REPETITIVE_TEXT", "Paragraphs repeat.");
  const faqs = content.sections.flatMap(s => s.faqs).map(f => normalizeWebsiteKeyword(f.question).replace(/[^\p{L}\p{N}\s]/gu, ""));
  if (new Set(faqs).size !== faqs.length) issue("DUPLICATE_FAQ", "FAQ questions repeat.");
  let claims = text;
  // Identity digits (airport codes, vehicle names) are not commercial evidence.
  for (const identity of [brief.entity.name, ...Object.values(brief.context)].sort((a, b) => b.length - a.length)) {
    claims = claims.split(identity).join("");
  }
  if (/\d|[₹$€£]|\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)\s+(minutes?|hours?|kilomet|miles?|cars?|vehicles?|stars?|rupees|reviews?)/i.test(claims)) {
    issue("UNSUPPORTED_NUMERIC_CLAIM", "Numeric copy needs verified business evidence; use a live binding.");
  }
  if (/\b(best|cheapest|guaranteed?|guarantees|award[ -]winning|top[ -]rated|always available|available now|unlimited|instant confirmation|free cancellation|no hidden charges|lowest price|five[ -]star)\b/i.test(text) ||
    /\b(we|ridegrid)\s+(offer|provide|have|operate|ensure|promise)\b/i.test(text) ||
    /\b(cars?|vehicles?|cabs?|drivers?)\s+(are\s+)?(available|ready|in stock)\b|\b(our fleet|our reviews|customers rate|rated by|award winning|award-winning|guaranteed availability)\b/i.test(text)) {
    issue("UNSUPPORTED_BUSINESS_CLAIM", "Promotional, inventory, availability or guarantee claim lacks verified evidence.");
  }
  if (/<\/?[a-z][^>]*>|javascript:/i.test(text)) issue("UNSAFE_MARKUP", "Content must be plain structured text.");
  if (text.length > 30000 || content.seoCandidates.title.length > 100 || content.seoCandidates.metaDescription.length > 220) {
    warn("LENGTH_BOUNDARY", "Copy exceeds content-side length guidance; revise before SEO finalization.");
  }
  if (body.split(/\s+/).filter(Boolean).length < 120) warn("THIN_CONTENT", "Insufficient substantive copy for publication.");
  if (Object.keys(brief.context).length < 2) warn("DOORWAY_RISK", "Limited distinctive source context; add useful entity-specific evidence before publication.");
  if (!brief.primaryKeyword) warn("NO_KEYWORDS", "No usable mapped primary keyword is available.");
  if (duplicateCopy) issue("DUPLICATE_CONTENT", "Identical copy already exists on another W5 page.");
  return { score: Math.max(0, 100 - issues.length * 20 - warnings.length * 8),
    status: issues.length ? "BLOCKED" : warnings.length ? "REVIEW" : "PASS", issues, warnings,
    recommendations: [...new Set([...issues, ...warnings].map(i => i.message)), "Editorial approval and W6 SEO finalization are required before publication."] };
}
