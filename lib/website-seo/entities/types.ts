export const WEBSITE_ENTITY_TYPES = [
  "ROUTE",
  "CITY",
  "SERVICE",
  "AIRPORT",
  "AREA",
  "VEHICLE",
] as const;

export type WebsiteEntityType =
  (typeof WEBSITE_ENTITY_TYPES)[number];

export const WEBSITE_ENTITY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type WebsiteEntityStatus =
  (typeof WEBSITE_ENTITY_STATUSES)[number];

export interface WebsiteEntity {
  id: string;
  type: WebsiteEntityType;
  name: string;
  slug: string;
  status: WebsiteEntityStatus;
  sourceId?: string | null;
  parentId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebsiteEntityInput {
  type: WebsiteEntityType;
  name: string;
  slug?: string;
  status?: WebsiteEntityStatus;
  sourceId?: string | null;
  parentId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateWebsiteEntityInput {
  name?: string;
  slug?: string;
  status?: WebsiteEntityStatus;
  sourceId?: string | null;
  parentId?: string | null;
  metadata?: Record<string, unknown> | null;
}
