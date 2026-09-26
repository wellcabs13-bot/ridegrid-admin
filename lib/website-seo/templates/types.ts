import type { WebsiteEntityType } from "@/lib/website-seo/entities";

export const WEBSITE_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type WebsiteTemplateStatus =
  (typeof WEBSITE_TEMPLATE_STATUSES)[number];

export const WEBSITE_TEMPLATE_SECTION_TYPES = [
  "HERO",
  "SEARCH",
  "OVERVIEW",
  "MARKETPLACE",
  "PRICING",
  "VEHICLES",
  "ROUTES",
  "SERVICES",
  "AIRPORTS",
  "AREAS",
  "FAQ",
  "REVIEWS",
  "TRUST",
  "CONTENT",
  "CTA",
  "RELATED",
] as const;

export type WebsiteTemplateSectionType =
  (typeof WEBSITE_TEMPLATE_SECTION_TYPES)[number];

export interface WebsiteTemplateSection {
  id: string;
  type: WebsiteTemplateSectionType;
  enabled: boolean;
  order: number;
  variant?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface WebsitePageTemplate {
  id: string;
  name: string;
  key: string;
  entityType: WebsiteEntityType;
  status: WebsiteTemplateStatus;
  pathPattern: string;
  sections: WebsiteTemplateSection[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebsitePageTemplateInput {
  name: string;
  key?: string;
  entityType: WebsiteEntityType;
  status?: WebsiteTemplateStatus;
  pathPattern: string;
  sections?: WebsiteTemplateSection[];
  metadata?: Record<string, unknown> | null;
}

export interface UpdateWebsitePageTemplateInput {
  name?: string;
  key?: string;
  status?: WebsiteTemplateStatus;
  pathPattern?: string;
  sections?: WebsiteTemplateSection[];
  metadata?: Record<string, unknown> | null;
}

export interface ResolvedWebsitePagePath {
  pathname: string;
  templateKey: string;
  entityType: WebsiteEntityType;
  entitySlug: string;
}
