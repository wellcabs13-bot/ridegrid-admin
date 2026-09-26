import { WEBSITE_TEMPLATE_SECTION_TYPES } from "../../templates/types";
import { ContentInputError, type GeneratedContent } from "../types";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.length <= 5000;
const texts = (v: unknown) => Array.isArray(v) && v.length <= 30 && v.every(text);
function fields(v: Record<string, unknown>, keys: string[]) {
  return Object.keys(v).length === keys.length && keys.every(k => k in v);
}
function binding(v: unknown): boolean {
  return v === null || (object(v) && fields(v, ["resource", "entityId", "state"]) && text(v.entityId) &&
    ["SEARCH", "MARKETPLACE", "PRICING", "VEHICLES", "REVIEWS", "TRUST"].includes(String(v.resource)) &&
    v.state === "REQUIRES_LIVE_RESOLUTION");
}
export function parseGeneratedContent(value: unknown): GeneratedContent {
  const fail = () => { throw new ContentInputError("Provider returned invalid structured content.", 422); };
  if (!object(value) || !fields(value, ["pageTitle", "seoCandidates", "sections"]) || !text(value.pageTitle) ||
    !object(value.seoCandidates) || !fields(value.seoCandidates, ["title", "metaDescription"]) ||
    !text(value.seoCandidates.title) || !text(value.seoCandidates.metaDescription) ||
    !Array.isArray(value.sections) || value.sections.length > 50) return fail();
  for (const section of value.sections) {
    if (!object(section) || !fields(section, ["id", "type", "heading", "paragraphs", "benefits", "context", "faqs", "links", "binding", "cta"]) ||
      !text(section.id) || !WEBSITE_TEMPLATE_SECTION_TYPES.includes(section.type as typeof WEBSITE_TEMPLATE_SECTION_TYPES[number]) ||
      !text(section.heading) || !texts(section.paragraphs) || !texts(section.benefits) ||
      !object(section.context) || !Object.values(section.context).every(text) || !binding(section.binding) ||
      !Array.isArray(section.faqs) || section.faqs.length > 12 || !Array.isArray(section.links) || section.links.length > 20) return fail();
    for (const faq of section.faqs) {
      if (!object(faq) || !fields(faq, ["question", "answer", "binding"]) || !text(faq.question) || !text(faq.answer) || !binding(faq.binding)) return fail();
    }
    for (const link of section.links) {
      if (!object(link) || !fields(link, ["entityId", "pageId", "pathname", "label", "relationship"]) ||
        ![link.entityId, link.pageId, link.pathname, link.label].every(text) ||
        !["PARENT", "CHILD", "SIBLING"].includes(String(link.relationship))) return fail();
    }
    if (section.cta !== null && (!object(section.cta) || !fields(section.cta, ["label", "intent"]) ||
      !text(section.cta.label) || !["CHECK_TRIP_OPTIONS", "EXPLORE_INFORMATION"].includes(String(section.cta.intent)))) return fail();
  }
  // All fields and nested collections have been checked; no provider object escapes unchecked.
  return value as unknown as GeneratedContent;
}
