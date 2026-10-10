import { normalizeWebsiteKeyword } from "../../keywords/normalize";
import type { ContentBinding, ContentBrief, ContentFAQ } from "../types";

export const liveBinding = (brief: ContentBrief, resource: ContentBinding["resource"]): ContentBinding =>
  ({ resource, entityId: brief.entity.id, state: "REQUIRES_LIVE_RESOLUTION" });

export function generateContentFAQs(brief: ContentBrief): ContentFAQ[] {
  const suggestions = [...brief.questions, `How can I check options for ${brief.entity.name}?`,
    `Where can I check the fare for ${brief.entity.name}?`];
  const seen = new Set<string>();
  const purposes = new Set<string>();
  return suggestions.flatMap(question => {
    const key = normalizeWebsiteKeyword(question).replace(/[?!.]+$/g, "");
    const purpose = /\b(fare|price|cost|pricing)\b/.test(key) ? "pricing" :
      /\b(book|booking|options|reserve|hire)\b/.test(key) ? "booking" : key;
    if (seen.has(key) || purposes.has(purpose)) return [];
    seen.add(key); purposes.add(purpose);
    const answer = purpose === "pricing"
      ? "Check the current trip quote for pricing. The total depends on the trip details and options returned by the booking service."
      : purpose === "booking"
        ? "Enter your trip details in the trip search. Review the returned options and terms before continuing."
        : "Confirm this detail against the current trip information before booking; this draft does not establish it.";
    return [{ question, answer, binding: liveBinding(brief, purpose === "pricing" ? "PRICING" : "SEARCH") }];
  }).slice(0, 6);
}
