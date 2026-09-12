export const WEBSITE_SEO_PERMISSIONS = {
  VIEW: "website-seo:view",
  MANAGE: "website-seo:manage",
  GENERATE: "website-seo:generate",
  PUBLISH: "website-seo:publish",
  AUTOMATE: "website-seo:automate",
  SETTINGS: "website-seo:settings",
} as const;

export type WebsiteSeoPermission =
  (typeof WEBSITE_SEO_PERMISSIONS)[keyof typeof WEBSITE_SEO_PERMISSIONS];
