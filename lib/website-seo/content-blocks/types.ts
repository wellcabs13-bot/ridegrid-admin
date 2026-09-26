export const WEBSITE_CONTENT_BLOCK_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type WebsiteContentBlockStatus =
  (typeof WEBSITE_CONTENT_BLOCK_STATUSES)[number];

export const WEBSITE_CONTENT_BLOCK_CATEGORIES = [
  "INFORMATION",
  "TRUST",
  "PROMOTION",
  "NOTICE",
  "CTA",
  "CUSTOM",
] as const;

export type WebsiteContentBlockCategory =
  (typeof WEBSITE_CONTENT_BLOCK_CATEGORIES)[number];

export const WEBSITE_CONTENT_BLOCK_SCOPES = [
  "HOMEPAGE",
  "GENERATED_PAGES",
  "ALL_PUBLIC_PAGES",
] as const;

export type WebsiteContentBlockScope =
  (typeof WEBSITE_CONTENT_BLOCK_SCOPES)[number];

export const WEBSITE_CONTENT_BLOCK_PLACEMENTS = [
  "BEFORE_PRIMARY_CONTENT",
  "AFTER_PRIMARY_CONTENT",
  "BEFORE_CTA",
  "AFTER_CTA",
] as const;

export type WebsiteContentBlockPlacement =
  (typeof WEBSITE_CONTENT_BLOCK_PLACEMENTS)[number];

export interface WebsiteContentBlockContent {
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface WebsiteContentBlock {
  id: string;
  name: string;
  key: string;
  status: WebsiteContentBlockStatus;
  category: WebsiteContentBlockCategory;
  scope: WebsiteContentBlockScope;
  placement: WebsiteContentBlockPlacement;
  order: number;
  content: WebsiteContentBlockContent;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteContentBlockStore {
  version: 1;
  blocks: WebsiteContentBlock[];
}

export interface WebsiteContentBlocksState {
  configured: boolean;
  blocks: WebsiteContentBlock[];
  updatedAt: string | null;
}

export interface CreateWebsiteContentBlockInput {
  name: string;
  key?: string;
  status?: WebsiteContentBlockStatus;
  category: WebsiteContentBlockCategory;
  scope: WebsiteContentBlockScope;
  placement: WebsiteContentBlockPlacement;
  content?: Partial<WebsiteContentBlockContent>;
}

export interface UpdateWebsiteContentBlockInput {
  name?: string;
  key?: string;
  status?: WebsiteContentBlockStatus;
  category?: WebsiteContentBlockCategory;
  scope?: WebsiteContentBlockScope;
  placement?: WebsiteContentBlockPlacement;
  order?: number;
  content?: Partial<WebsiteContentBlockContent>;
}

export const EMPTY_WEBSITE_CONTENT_BLOCK_CONTENT: WebsiteContentBlockContent = {
  eyebrow: "",
  heading: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
};