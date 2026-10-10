import { normalizeWebsiteKeyword } from "../normalize";
import type { WebsiteEntityType } from "../../entities/types";
import type { WebsiteKeywordIntent, WebsiteKeywordType } from "../types";

const question = /^(how|what|why|when|where|can|does|is)\b/;
const commercial = /\b(fare|price|cost|best|compare|comparison|pricing)\b/;

export function classifyKeywordIntent(keyword: string): WebsiteKeywordIntent {
  const text = normalizeWebsiteKeyword(keyword);
  if (question.test(text) || /\b(guide|tips)\b/.test(text)) return "INFORMATIONAL";
  if (commercial.test(text)) return "COMMERCIAL";
  // Explicit destination-seeking signals; a brand mention alone is insufficient.
  if (/\b(login|sign in|official website|customer portal)\b/.test(text)) return "NAVIGATIONAL";
  if (/\b(book|booking|hire|reserve)\b/.test(text)) return "TRANSACTIONAL";
  if (/\b(near me|local|nearby|in)\b/.test(text)) return "LOCAL";
  return "TRANSACTIONAL";
}

export function classifyKeywordType(keyword: string, entityType: WebsiteEntityType): WebsiteKeywordType {
  const text = normalizeWebsiteKeyword(keyword);
  if (question.test(text)) return "QUESTION";
  if (commercial.test(text)) return "COMMERCIAL";
  if (/\b(guide|tips)\b/.test(text)) return "INFORMATIONAL";
  if (/\b(near me|local|nearby)\b/.test(text)) return "LOCAL";
  if (text.split(" ").length >= 8) return "LONG_TAIL";
  return entityType === "AREA" ? "LOCAL" : entityType;
}
