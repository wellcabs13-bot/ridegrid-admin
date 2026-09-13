export const WEBSITE_MEDIA_CATEGORIES = ["HERO", "ROUTE", "CITY", "SERVICE", "AIRPORT", "AREA", "VEHICLE", "CONTENT", "GENERAL"] as const;
export const WEBSITE_MEDIA_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
// Matches the existing image upload and file-serving contract.
export const WEBSITE_MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export type WebsiteMediaCategory = typeof WEBSITE_MEDIA_CATEGORIES[number];
export type WebsiteMediaStatus = typeof WEBSITE_MEDIA_STATUSES[number];
export interface WebsiteMediaMetadata {
  fileAssetId: string;
  title: string;
  altText: string;
  caption: string;
  category: WebsiteMediaCategory;
  status: WebsiteMediaStatus;
  createdAt: string;
  updatedAt: string;
}
export type WebsiteMediaUpdate = Partial<Pick<WebsiteMediaMetadata, "title" | "altText" | "caption" | "category" | "status">>;
export interface WebsiteMedia extends WebsiteMediaMetadata {
  fileName: string;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string;
  uploadedAt: string;
}
export interface WebsiteMediaLibrary {
  items: WebsiteMedia[];
  summary: { total: number; active: number; draft: number; archived: number };
  missingFileCount: number;
}
export interface WebsiteMediaFilters {
  search?: string;
  status?: string;
  category?: string;
  mimeType?: string;
}
