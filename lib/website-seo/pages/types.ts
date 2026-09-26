import type {
  WebsiteEntityStatus,
  WebsiteEntityType,
} from "@/lib/website-seo/entities";

import type {
  WebsiteTemplateSection,
} from "@/lib/website-seo/templates";

export const WEBSITE_GENERATED_PAGE_STATUSES = [
  "DRAFT",
  "READY",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type WebsiteGeneratedPageStatus =
  (typeof WEBSITE_GENERATED_PAGE_STATUSES)[number];

export interface WebsiteGeneratedPageEntitySnapshot {
  id: string;
  type: WebsiteEntityType;
  name: string;
  slug: string;
  status: WebsiteEntityStatus;
  sourceId: string | null;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface WebsiteGeneratedPageTemplateSnapshot {
  id: string;
  name: string;
  key: string;
  pathPattern: string;
  sections: WebsiteTemplateSection[];
  metadata: Record<string, unknown> | null;
}

export interface WebsiteGeneratedPageDefinition {
  key: string;
  entityId: string;
  entityType: WebsiteEntityType;
  entitySlug: string;
  templateId: string;
  templateKey: string;
  pathname: string;
  status: WebsiteGeneratedPageStatus;
  entity: WebsiteGeneratedPageEntitySnapshot;
  template: WebsiteGeneratedPageTemplateSnapshot;
  generation: {
    engine: "RIDEGRID_PAGE_GENERATOR";
    version: 1;
  };
}

export interface GenerateWebsitePageInput {
  entityId: string;
  templateId?: string;
  generateImages?: boolean;
}
