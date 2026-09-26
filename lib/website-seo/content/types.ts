import type { WebsiteEntityType } from "../entities/types";
import type { WebsiteKeywordIntent } from "../keywords/types";
import type { WebsiteTemplateSection, WebsiteTemplateSectionType } from "../templates/types";

export interface ContentEntity {
  id: string;
  type: WebsiteEntityType;
  name: string;
  parentId: string | null;
  metadata: unknown;
}
export interface ContentKeyword {
  id: string;
  keyword: string;
  entityId: string | null;
  type: string;
  intent: WebsiteKeywordIntent;
  status: string;
  clusterKey: string | null;
  primaryKeywordId: string | null;
}
export interface ContentPage {
  id: string;
  entityId: string;
  templateId: string;
  pathname: string;
  status: string;
}
export interface ContentLink {
  entityId: string;
  pageId: string;
  pathname: string;
  label: string;
  relationship: "PARENT" | "CHILD" | "SIBLING";
}
export interface ContentBrief {
  entity: Pick<ContentEntity, "id" | "name" | "type">;
  page: ContentPage | null;
  templateId: string;
  primaryKeyword: ContentKeyword | null;
  supportingKeywords: ContentKeyword[];
  searchIntent: WebsiteKeywordIntent | null;
  clusterKey: string | null;
  recommendedSections: WebsiteTemplateSection[];
  topics: string[];
  questions: string[];
  context: Record<string, string>;
  internalLinks: ContentLink[];
  ctaIntent: "CHECK_TRIP_OPTIONS" | "EXPLORE_INFORMATION";
  constraints: string[];
}
export type ContentBindingResource = "SEARCH" | "MARKETPLACE" | "PRICING" | "VEHICLES" | "REVIEWS" | "TRUST";
/** Declarative reference, not an invented endpoint or a claim that data is available. */
export interface ContentBinding {
  resource: ContentBindingResource;
  entityId: string;
  state: "REQUIRES_LIVE_RESOLUTION";
}
export interface ContentFAQ { question: string; answer: string; binding: ContentBinding | null }
export interface ContentSection {
  id: string;
  type: WebsiteTemplateSectionType;
  heading: string;
  paragraphs: string[];
  benefits: string[];
  context: Record<string, string>;
  faqs: ContentFAQ[];
  links: ContentLink[];
  binding: ContentBinding | null;
  cta: { label: string; intent: ContentBrief["ctaIntent"] } | null;
}
export interface GeneratedContent {
  pageTitle: string;
  seoCandidates: { title: string; metaDescription: string };
  sections: ContentSection[];
}
export interface ContentQuality {
  score: number;
  status: "PASS" | "REVIEW" | "BLOCKED";
  issues: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
  recommendations: string[];
}
export interface ContentGenerationProvider {
  readonly id: string;
  generate(brief: ContentBrief): Promise<unknown>;
}
export interface ContentResult extends GeneratedContent {
  entity: ContentBrief["entity"];
  page: ContentPage | null;
  brief: ContentBrief;
  faq: ContentFAQ[];
  quality: ContentQuality;
  generation: { engine: "W5"; version: 1; provider: string; editorialStatus: "DRAFT"; fingerprint: string };
}
export class ContentInputError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}
