import { normalizeWebsiteKeyword } from "../../keywords/normalize";
import { validateContentQuality } from "../../content/quality";
import { generateSeoSchema } from "../schema";
import { selectSeoLinks } from "../internal-links";
import { decideSeoIndexability } from "../indexability";
import { resolveSeoCanonical } from "../canonical";
import type { SeoInput, SeoIssueCode, SeoPlan, SeoQuality } from "../types";

export function validateSeoQuality(input: SeoInput, plan: Omit<SeoPlan, "quality" | "generation">): SeoQuality {
  const issues: SeoQuality["issues"] = [];
  const warnings: SeoQuality["warnings"] = [];
  const add = (code: SeoIssueCode, message: string, warning = false) => { (warning ? warnings : issues).push({ code, message }); };
  if (!plan.metadata.title.trim()) add("TITLE_EMPTY", "Title is empty.");
  else if (plan.metadata.title.length < 15 || plan.metadata.title.length > 65) add("TITLE_LENGTH", "Review title length; complete words were preserved.", true);
  if (!plan.metadata.description.trim()) add("DESCRIPTION_EMPTY", "Meta description is empty.");
  else if (plan.metadata.description.length < 70 || plan.metadata.description.length > 170) add("DESCRIPTION_LENGTH", "Review meta-description length; complete words were preserved.", true);
  if (plan.canonical.kind === "INVALID") add("CANONICAL_INVALID", "Stored page path or site origin is invalid.");
  if (JSON.stringify(plan.canonical) !== JSON.stringify(resolveSeoCanonical(input.page.pathname, input.baseUrl, input.trailingSlash))) {
    add("CANONICAL_INVALID", "Canonical does not resolve to the existing current page.");
  }
  if (plan.canonical.kind === "RELATIVE") add("CANONICAL_RELATIVE", "Configure a real site origin before publication.", true);
  if (input.canonicalConflict) add("CANONICAL_CONFLICT", "Another stored page resolves to this canonical path.");
  if (!input.content) add("CONTENT_UNAVAILABLE", "Valid mapped W5 content is not available.");
  else {
    // Reuse W5 guardrails, including fabricated claims; do not implement another content validator.
    const quality = validateContentQuality(input.brief, { ...input.content,
      seoCandidates: { title: plan.metadata.title, metaDescription: plan.metadata.description } });
    if (quality.status !== "PASS") add("CONTENT_QUALITY", "W5 content checks require review; the page remains non-indexable.", quality.status !== "BLOCKED");
    if (quality.issues.some(issue => issue.code === "KEYWORD_STUFFING")) add("KEYWORD_STUFFING", "W5 detected keyword stuffing.");
    const clean = (text: string) => text.trim().replace(/\s+/g, " ");
    if (plan.metadata.title !== clean(input.content.seoCandidates.title) || plan.metadata.description !== clean(input.content.seoCandidates.metaDescription)) {
      add("CONTENT_MISMATCH", "Metadata differs from the W5 candidates.");
    }
  }
  const metadataText = normalizeWebsiteKeyword(`${plan.metadata.title} ${plan.metadata.description}`);
  for (const k of input.keywords.filter(k => k.entityId === input.entity.id && !["REJECTED", "ARCHIVED"].includes(k.status))) {
    const key = normalizeWebsiteKeyword(k.keyword);
    if (key.length > 1 && metadataText.split(key).length - 1 >= 3) { add("KEYWORD_STUFFING", "Metadata repeats the same keyword excessively."); break; }
  }
  if (plan.metadata.primaryKeyword && !normalizeWebsiteKeyword(`${metadataText} ${plan.metadata.heading}`).includes(normalizeWebsiteKeyword(plan.metadata.primaryKeyword))) {
    add("PRIMARY_RELEVANCE", "Primary keyword is not covered by metadata or heading.", true);
  }
  if (JSON.stringify(plan.schema) !== JSON.stringify(generateSeoSchema(input, plan.metadata, plan.canonical, plan.internalLinks))) {
    add("SCHEMA_INVALID", "Schema contains unsupported, duplicate, unmapped or invalid nodes.");
  }
  if (plan.canonical.kind === "ABSOLUTE" && !plan.schema["@graph"].some(n => n["@type"] === "WebPage")) {
    add("SCHEMA_MISSING", "WebPage schema is unavailable because content is unsafe or incomplete.", true);
  }
  if (JSON.stringify(plan.internalLinks) !== JSON.stringify(selectSeoLinks(input))) add("LINK_INVALID", "Internal links contain a self-link, duplicate or unsupported target.");
  const baseDecision = decideSeoIndexability(input, plan.canonical);
  if (plan.indexability.indexable && (!baseDecision.indexable || issues.length > 0) || plan.indexability.robots.index !== plan.indexability.indexable) {
    add("INDEXABILITY_CONFLICT", "Indexability conflicts with technical or content requirements.");
  }
  if (plan.sitemapEligibility.eligible && (!plan.indexability.indexable || input.page.status !== "PUBLISHED" || plan.canonical.kind !== "ABSOLUTE") ||
    plan.sitemapEligibility.indexable !== plan.indexability.indexable) add("SITEMAP_CONFLICT", "Sitemap eligibility conflicts with indexability/lifecycle.");
  if (input.duplicateTitle) add("DUPLICATE_TITLE", "Another W6 page has the same normalized title.");
  if (input.duplicateDescription) add("DUPLICATE_DESCRIPTION", "Another W6 page has the same normalized description.");
  if (!input.editorialApproved) add("EDITORIAL_REVIEW", "W5 content is not editorially approved.", true);
  return { score: Math.max(0, 100 - issues.length * 20 - warnings.length * 6),
    status: issues.length ? "BLOCKED" : warnings.length ? "REVIEW" : "PASS", issues, warnings,
    recommendations: [...new Set([...issues, ...warnings].map(i => i.message))] };
}
