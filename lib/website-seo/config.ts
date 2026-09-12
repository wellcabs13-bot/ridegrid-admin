export const websiteSeoConfig = {
  module: "website-seo",
  name: "Website & SEO",
  defaultApprovalMode: "ASSISTED",
  publishingEnabled: false,
  aiEnabled: false,
  indexingEnabled: false,
} as const;

export type WebsiteSeoApprovalMode =
  | "MANUAL"
  | "ASSISTED"
  | "AUTOMATIC";
