export const IMAGE_SLOTS = ["heroImage", "sectionImage1", "sectionImage2", "cardImage", "featuredImage", "ogImage", "galleryImage1", "galleryImage2"] as const;
export type ImageSlot = typeof IMAGE_SLOTS[number];
export const PAGE_FAMILIES = ["HOMEPAGE", "ROUTE", "CITY", "SERVICE", "AIRPORT", "AREA", "VEHICLE"] as const;
export type PageFamily = typeof PAGE_FAMILIES[number];
export type ImageSize = "1536x1024" | "1024x1024" | "1024x1536";
export type ImageQuality = "low" | "medium" | "high" | "auto";
export type JobStatus = "DRAFT" | "QUEUED" | "PROCESSING" | "GENERATED" | "APPROVED" | "REJECTED" | "FAILED";
export interface ImagePreset { id: string; name: string; tone: string; hints: string; useCase: string; size: ImageSize; negativePrompt: string }
export interface ImageTarget { pageId: string; family: PageFamily; title: string; pathname: string; context: string; keywords: string[]; majorCommercial?: boolean }
export interface ImageJob {
  attempts?: number; notBefore?: string | null;
  id: string; target: ImageTarget; slot: ImageSlot; prompt: string; negativePrompt: string; preset: ImagePreset;
  status: JobStatus; provider: string; model: string; size: ImageSize; quality: ImageQuality;
  altText: string; filename: string; autoAssign: boolean; assetId: string | null; error: string | null;
  width: number | null; height: number | null; mimeType: string | null;
  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string; claim: string | null;
}
export interface ImageAssignment { pageId: string; slot: ImageSlot; assetId: string; altText: string; jobId: string | null; updatedAt: string; updatedBy: string }
export interface ImageEngineState {
  version: 1; jobs: ImageJob[]; assignments: ImageAssignment[]; presets: ImagePreset[];
  autoGenerate: boolean; updatedBy: string; updatedAt: string;
}
export class ImageEngineError extends Error {}
