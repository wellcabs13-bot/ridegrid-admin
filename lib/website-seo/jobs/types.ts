export type WebsiteSeoJobType =
  | "KEYWORD_RESEARCH"
  | "PAGE_GENERATION"
  | "CONTENT_GENERATION"
  | "SEO_GENERATION"
  | "PUBLISH"
  | "INDEX_DISCOVERY"
  | "PERFORMANCE_REFRESH";

export type WebsiteSeoJobState =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export interface WebsiteSeoJob {
  id: string;
  type: WebsiteSeoJobType;
  state: WebsiteSeoJobState;
  entityId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
