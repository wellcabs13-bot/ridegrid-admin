import type { ContentBrief, ContentEntity, ContentKeyword, ContentPage, ContentQuality, GeneratedContent } from "../content/types";

export interface SeoEntity extends ContentEntity { status: string }
export interface SeoCanonical {
  kind: "ABSOLUTE" | "RELATIVE" | "INVALID";
  path: string | null;
  url: string | null;
  reasonCodes: string[];
}
export interface SeoMetadata {
  title: string;
  description: string;
  source: "W5" | "ENTITY_FALLBACK";
  heading: string;
  primaryKeyword: string | null;
  openGraph: { title: string; description: string; type: "website"; url: string | null };
}
export interface SeoIndexability {
  indexable: boolean;
  robots: { index: boolean; follow: boolean };
  reasonCodes: string[];
}
export interface SeoLink { pageId: string; entityId: string; path: string; anchor: string; reason: "PARENT" | "CHILD" | "SIBLING" }
export type SeoSchemaNode = {
  "@type": "WebPage"; "@id": string; url: string; name: string; description: string;
} | {
  "@type": "BreadcrumbList"; "@id": string;
  itemListElement: { "@type": "ListItem"; position: number; name: string; item: string }[];
} | {
  "@type": "FAQPage"; "@id": string;
  mainEntity: { "@type": "Question"; name: string; acceptedAnswer: { "@type": "Answer"; text: string } }[];
};
export interface SeoSchema { "@context": "https://schema.org"; "@graph": SeoSchemaNode[] }
export interface SeoRedirect { from: string; to: string; status: 308; reason: "HISTORICAL_PATH" | "NORMALIZED_VARIANT" }
export interface SeoRedirectResult { recommendations: SeoRedirect[]; rejected: { path: string; reason: string }[] }
export interface SeoSitemap { eligible: boolean; reasonCodes: string[]; canonicalPath: string | null; indexable: boolean; pageStatus: string }
export type SeoIssueCode = "TITLE_EMPTY" | "TITLE_LENGTH" | "DESCRIPTION_EMPTY" | "DESCRIPTION_LENGTH" |
  "CANONICAL_INVALID" | "CANONICAL_RELATIVE" | "CANONICAL_CONFLICT" | "CONTENT_UNAVAILABLE" |
  "CONTENT_QUALITY" | "KEYWORD_STUFFING" | "PRIMARY_RELEVANCE" | "CONTENT_MISMATCH" |
  "SCHEMA_INVALID" | "SCHEMA_MISSING" | "LINK_INVALID" | "INDEXABILITY_CONFLICT" | "SITEMAP_CONFLICT" |
  "DUPLICATE_TITLE" | "DUPLICATE_DESCRIPTION" | "EDITORIAL_REVIEW";
export interface SeoQuality {
  score: number; status: "PASS" | "REVIEW" | "BLOCKED";
  issues: { code: SeoIssueCode; message: string }[];
  warnings: { code: SeoIssueCode; message: string }[];
  recommendations: string[];
}
export interface SeoInput {
  entity: SeoEntity;
  page: ContentPage;
  brief: ContentBrief;
  content: GeneratedContent | null;
  contentQuality: ContentQuality | null;
  editorialApproved: boolean;
  keywords: ContentKeyword[];
  targets: { entity: SeoEntity; page: ContentPage }[];
  baseUrl?: string;
  trailingSlash?: boolean;
  canonicalConflict?: boolean;
  duplicateTitle?: boolean;
  duplicateDescription?: boolean;
  historicalPaths?: string[];
  existingRedirects?: { from: string; to: string }[];
}
export interface SeoPlan {
  entity: { id: string; name: string; type: SeoEntity["type"]; status: string };
  page: ContentPage;
  metadata: SeoMetadata;
  canonical: SeoCanonical;
  indexability: SeoIndexability;
  schema: SeoSchema;
  internalLinks: SeoLink[];
  redirectSignals: SeoRedirectResult;
  sitemapEligibility: SeoSitemap;
  quality: SeoQuality;
  generation: { engine: "W6"; version: 1; ownership: "GENERATED_DRAFT"; fingerprint: string };
}
export class SeoInputError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}
