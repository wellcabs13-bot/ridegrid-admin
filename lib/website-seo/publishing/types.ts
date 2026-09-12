import type { WebsiteSeoPageStatus } from "@prisma/client";
import type { SeoPlan } from "../seo/types";
export type PublicationStatus = WebsiteSeoPageStatus;
export type PublicationDecision = "PREVIEW" | "PUBLISH" | "UNPUBLISH";
export interface PublishingIssue { code: string; message: string }
export interface PublicationReadiness { ready: boolean; blockingIssues: PublishingIssue[]; warnings: PublishingIssue[]; reasonCodes: string[] }
export interface PublishedUrl { path: string | null; absoluteUrl: string | null }
export interface SitemapEntry { url: string; lastmod?: string }
export interface DiscoveryRecord { published: boolean; crawlEligible: boolean; sitemapIncluded: boolean; url: PublishedUrl; internalLinks: string[] }
export type IndexCoverageState = "UNKNOWN" | "DISCOVERED" | "CRAWLED" | "INDEXED" | "NOT_INDEXED" | "BLOCKED" | "ERROR";
export type CrawlState = "UNKNOWN" | "CRAWLED" | "BLOCKED" | "ERROR";
export interface SearchConsoleState { provider: string; coverage: IndexCoverageState; crawl: CrawlState; observedAt: string | null }
export interface IndexingStatus { provider: string; requestState: "NOT_SENT" | "ACCEPTED" | "ERROR"; external: SearchConsoleState }
export interface IndexingRequest { pageId: string; url: string; sitemapUrl: string; idempotencyKey: string }
export interface PublishingActivity { action: "PUBLISH" | "UNPUBLISH" | "SYNC"; outcome: "CHANGED" | "UNCHANGED" | "BLOCKED"; occurredAt: string | null }
export interface PublicationResult { pageId: string; status: PublicationStatus; readiness: PublicationReadiness; discovery: DiscoveryRecord;
  activity: PublishingActivity | null; plan: SeoPlan }
export class PublishingError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}
