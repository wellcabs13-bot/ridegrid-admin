import type { WebsiteSeoKeyword, WebsiteSeoPage, WebsiteSeoEntity } from "@prisma/client";

export const COMPETITOR_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export const OBSERVATION_KINDS = ["ORGANIC_RANKING", "AI_VISIBILITY"] as const;
export const OBSERVATION_SUBJECTS = ["OWN_SITE", "COMPETITOR"] as const;
export type CompetitorStatus = typeof COMPETITOR_STATUSES[number];
export type ObservationKind = typeof OBSERVATION_KINDS[number];
export type ObservationSubject = typeof OBSERVATION_SUBJECTS[number];
export interface CompetitorInput { name: string; domain: string; status: CompetitorStatus; notes: string | null }
export interface ObservationInput {
  kind: ObservationKind; subject: ObservationSubject; provider: string; query: string;
  keywordId: string | null; pageId: string | null; competitorId: string | null; url: string | null;
  rank: number | null; visibilityScore: number | null; mentioned: boolean | null; cited: boolean | null;
  observedAt: Date;
  metadata: { sourceType: "MANUAL" | "PROVIDER"; notes?: string; evidenceUrl?: string };
}
export type KeywordSource = Pick<WebsiteSeoKeyword, "id" | "keyword" | "type" | "intent" | "status" | "entityId" | "entityType" | "clusterKey" | "primaryKeywordId"> & { metrics: unknown };
export type PageSource = Pick<WebsiteSeoPage, "id" | "entityId" | "pathname" | "status">;
export type EntitySource = Pick<WebsiteSeoEntity, "id" | "type" | "name">;
export interface RealMetrics { opportunityScore: number | null; searchVolume: number | null; difficulty: number | null; cpc: number | null; competition: number | null }
export interface Opportunity extends Omit<KeywordSource, "metrics"> { metrics: RealMetrics; entity: EntitySource | null; pages: PageSource[]; mapped: boolean }
export interface Cluster {
  clusterKey: string; keywordCount: number; primaryKeywords: { id: string; keyword: string }[];
  entities: EntitySource[]; statuses: string[]; types: string[]; intents: string[];
  mapped: boolean; unmappedKeywords: number;
}
