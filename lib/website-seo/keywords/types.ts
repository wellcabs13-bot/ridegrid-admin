import type {
  WebsiteEntityType,
} from "@/lib/website-seo/entities";

export const WEBSITE_KEYWORD_TYPES = [
  "PRIMARY",
  "SECONDARY",
  "LONG_TAIL",
  "LOCAL",
  "ROUTE",
  "CITY",
  "AIRPORT",
  "SERVICE",
  "VEHICLE",
  "COMMERCIAL",
  "INFORMATIONAL",
  "QUESTION",
] as const;

export type WebsiteKeywordType =
  (typeof WEBSITE_KEYWORD_TYPES)[number];

export const WEBSITE_KEYWORD_INTENTS = [
  "TRANSACTIONAL",
  "COMMERCIAL",
  "INFORMATIONAL",
  "NAVIGATIONAL",
  "LOCAL",
] as const;

export type WebsiteKeywordIntent =
  (typeof WEBSITE_KEYWORD_INTENTS)[number];

export const WEBSITE_KEYWORD_STATUSES = [
  "DISCOVERED",
  "APPROVED",
  "MAPPED",
  "ACTIVE",
  "REJECTED",
  "ARCHIVED",
] as const;

export type WebsiteKeywordStatus =
  (typeof WEBSITE_KEYWORD_STATUSES)[number];

export interface WebsiteKeywordMetrics {
  searchVolume?: number | null;
  difficulty?: number | null;
  cpc?: number | null;
  competition?: number | null;
  opportunityScore?: number | null;
}

export interface WebsiteKeyword {
  id: string;
  keyword: string;
  normalizedKeyword: string;

  type: WebsiteKeywordType;
  intent: WebsiteKeywordIntent;
  status: WebsiteKeywordStatus;

  entityId: string | null;
  entityType: WebsiteEntityType | null;

  clusterKey: string | null;
  primaryKeywordId: string | null;

  metrics: WebsiteKeywordMetrics | null;
  metadata: Record<string, unknown> | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebsiteKeywordInput {
  keyword: string;

  type?: WebsiteKeywordType;
  intent?: WebsiteKeywordIntent;
  status?: WebsiteKeywordStatus;

  entityId?: string | null;
  entityType?: WebsiteEntityType | null;

  clusterKey?: string | null;
  primaryKeywordId?: string | null;

  metrics?: WebsiteKeywordMetrics | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateWebsiteKeywordInput {
  keyword?: string;

  type?: WebsiteKeywordType;
  intent?: WebsiteKeywordIntent;
  status?: WebsiteKeywordStatus;

  entityId?: string | null;
  entityType?: WebsiteEntityType | null;

  clusterKey?: string | null;
  primaryKeywordId?: string | null;

  metrics?: WebsiteKeywordMetrics | null;
  metadata?: Record<string, unknown> | null;
}
