export const WEBSITE_PUBLIC_NAVIGATION_LOCATIONS = [
  "HEADER",
  "FOOTER_PRIMARY",
  "FOOTER_SECONDARY",
  "FOOTER_LEGAL",
] as const;

export type WebsitePublicNavigationLocation =
  (typeof WEBSITE_PUBLIC_NAVIGATION_LOCATIONS)[number];

export const WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES = [
  "INTERNAL",
  "EXTERNAL",
] as const;

export type WebsitePublicNavigationLinkType =
  (typeof WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES)[number];

export interface WebsitePublicNavigationItem {
  id: string;
  label: string;
  href: string;
  location: WebsitePublicNavigationLocation;
  linkType: WebsitePublicNavigationLinkType;
  enabled: boolean;
  openInNewTab: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitePublicNavigationStore {
  version: 1;
  items: WebsitePublicNavigationItem[];
}

export interface WebsitePublicNavigationState {
  configured: boolean;
  items: WebsitePublicNavigationItem[];
  updatedAt: string | null;
}

export interface CreateWebsitePublicNavigationItemInput {
  label: string;
  href: string;
  location: WebsitePublicNavigationLocation;
  linkType: WebsitePublicNavigationLinkType;
  enabled?: boolean;
  openInNewTab?: boolean;
}

export interface UpdateWebsitePublicNavigationItemInput {
  label?: string;
  href?: string;
  location?: WebsitePublicNavigationLocation;
  linkType?: WebsitePublicNavigationLinkType;
  enabled?: boolean;
  openInNewTab?: boolean;
  order?: number;
}