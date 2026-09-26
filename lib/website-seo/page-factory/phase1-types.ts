import type { SearchContext } from "../../website-public/marketplace";
export type Phase1Family = "city" | "area" | "service" | "airport" | "vehicle" | "route" | "tour";
export type Phase1State = "READY_INDEX" | "NOINDEX_NEEDS_WORK";
export type Phase1SupplyState = "LIVE_SUPPLY_AVAILABLE" | "LIVE_SUPPLY_EMPTY" | "PRICING_NOT_CONFIGURED" | "NOT_CHECKED";
export interface Phase1Page {
  pageId: string; pageType: Phase1Family; priority: string; entity: string; city: string;
  slug: string; canonicalUrl: string; primaryKeyword: string; title: string; h1: string; description: string;
  indexState: Phase1State; reasons: string[]; intro: string;
  capabilityState: "BOOKING_CAPABLE" | "CAPABILITY_LIMITED";
  supplyState: Phase1SupplyState;
  secondaryKeywords: string[]; transactionalKeywords: string[]; longTailKeywords: string[]; questionKeywords: string[]; excludedKeywords: string[];
  editorial: { heading: string; paragraphs: string[] }[];
  faqs: { question: string; answer: string }[];
  links: { label: string; href: string; family: string }[];
  sources: string[]; sourceRecord: Record<string, unknown>;
  search: SearchContext; bookingSupported: boolean;
  mediaState: string; schemaState: "VALID";
}
