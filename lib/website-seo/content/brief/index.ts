import { normalizeWebsiteKeyword } from "../../keywords/normalize";
import type { ContentBrief, ContentEntity, ContentKeyword, ContentLink, ContentPage } from "../types";
import type { WebsiteTemplateSection } from "../../templates/types";

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function buildContentBrief(input: { entity: ContentEntity; page: ContentPage | null;
  templateId: string; sections: WebsiteTemplateSection[]; keywords: ContentKeyword[]; links: ContentLink[] }): ContentBrief {
  const { entity } = input;
  const priority: Record<string, number> = { ACTIVE: 0, MAPPED: 1, APPROVED: 2, DISCOVERED: 3 };
  const keywords = input.keywords.filter(k => k.entityId === entity.id && k.status in priority)
    .map(k => ({ id: k.id, keyword: k.keyword, entityId: k.entityId, type: k.type, intent: k.intent,
      status: k.status, clusterKey: k.clusterKey, primaryKeywordId: k.primaryKeywordId }))
    .sort((a, b) => priority[a.status] - priority[b.status] || compare(a.keyword, b.keyword) || compare(a.id, b.id));
  const primary = keywords.find(k => k.type === "PRIMARY" && !k.primaryKeywordId) ??
    keywords.find(k => !k.primaryKeywordId && k.type !== "SECONDARY") ?? null;
  const seen = new Set<string>();
  const supporting = keywords.filter(k => {
    const normalized = normalizeWebsiteKeyword(k.keyword);
    if (k.id === primary?.id || normalized === normalizeWebsiteKeyword(primary?.keyword ?? "") || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  const metadata = entity.metadata && typeof entity.metadata === "object" && !Array.isArray(entity.metadata)
    ? entity.metadata as Record<string, unknown> : {};
  const context: Record<string, string> = {};
  // Identity/location fields only. Freeform text and commercial numbers are not trusted claims.
  for (const key of ["fromCity", "toCity", "originCity", "destinationCity", "city", "airportCode"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim() && value.length <= 160) context[key] = value.trim();
  }
  return {
    entity: { id: entity.id, type: entity.type, name: entity.name }, page: input.page, templateId: input.templateId,
    primaryKeyword: primary, supportingKeywords: supporting,
    searchIntent: primary?.intent ?? null, clusterKey: primary?.clusterKey ?? null,
    recommendedSections: input.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order || compare(a.id, b.id)),
    topics: [...new Set(supporting.map(k => k.keyword))].slice(0, 12),
    questions: supporting.filter(k => /^(how|what|why|when|where|can|does|is)\b/i.test(k.keyword)).map(k => k.keyword).slice(0, 6),
    context, internalLinks: [...input.links].sort((a, b) => compare(a.pathname, b.pathname)),
    ctaIntent: primary?.intent === "INFORMATIONAL" ? "EXPLORE_INFORMATION" : "CHECK_TRIP_OPTIONS",
    constraints: ["Draft only; editorial review required before publication.",
      "Use entity identity and supplied context; never infer business facts from keywords.",
      "Live pricing, travel estimates, availability, inventory, reviews and trust claims require RideGrid data bindings.",
      "No best/cheapest claims, fabricated metrics, keyword stuffing or doorway pages.",
      "SEO and internal links are candidates only; W6 owns finalization."],
  };
}
