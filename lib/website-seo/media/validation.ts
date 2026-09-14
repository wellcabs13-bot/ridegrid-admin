import { WEBSITE_MEDIA_CATEGORIES, WEBSITE_MEDIA_STATUSES, type WebsiteMediaMetadata, type WebsiteMediaUpdate } from "./types";

export class WebsiteMediaValidationError extends Error {}

export function hasMeaningfulAltText(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value.trim());
}

export function validateMediaUpdate(value: unknown): WebsiteMediaUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WebsiteMediaValidationError("Media metadata must be an object.");
  }
  const source = value as Record<string, unknown>;
  const result: WebsiteMediaUpdate = {};
  const allowed = ["title", "altText", "caption", "category", "status"];
  if (Object.keys(source).some((key) => !allowed.includes(key))) {
    throw new WebsiteMediaValidationError("Only title, altText, caption, category and status can be edited.");
  }
  for (const key of ["title", "altText", "caption"] as const) {
    if (source[key] === undefined) continue;
    const text = source[key];
    const limit = key === "caption" ? 4000 : 500;
    if (typeof text !== "string" || text.length > limit) {
      throw new WebsiteMediaValidationError(`${key} must be text of at most ${limit} characters.`);
    }
    result[key] = text.trim();
  }
  if (source.category !== undefined) {
    const category = WEBSITE_MEDIA_CATEGORIES.find((item) => item === source.category);
    if (!category) throw new WebsiteMediaValidationError("Invalid media category.");
    result.category = category;
  }
  if (source.status !== undefined) {
    const status = WEBSITE_MEDIA_STATUSES.find((item) => item === source.status);
    if (!status) throw new WebsiteMediaValidationError("Invalid media status.");
    result.status = status;
  }
  return result;
}

export function validateMediaStore(value: unknown): WebsiteMediaMetadata[] {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("Stored website media metadata is invalid.");
  }
  const ids = new Set<string>();
  return value.items.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Stored media entry is invalid.");
    const row = item as Record<string, unknown>;
    const { fileAssetId, createdAt, updatedAt } = row;
    if (typeof fileAssetId !== "string" || !fileAssetId || ids.has(fileAssetId) ||
        typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt)) ||
        typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) {
      throw new Error("Stored media identifier or timestamps are invalid.");
    }
    ids.add(fileAssetId);
    const fields = validateMediaUpdate({ title: row.title, altText: row.altText, caption: row.caption, category: row.category, status: row.status });
    if (fields.title === undefined || fields.altText === undefined || fields.caption === undefined || !fields.category || !fields.status) {
      throw new Error("Stored media metadata is incomplete.");
    }
    if (row.aiGenerated !== undefined && (row.aiGenerated !== true || typeof row.aiJobId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(row.aiJobId))) throw new Error("Stored AI media provenance is invalid.");
    return { fileAssetId, createdAt, updatedAt, title: fields.title, altText: fields.altText, caption: fields.caption, category: fields.category, status: fields.status,
      ...(row.aiGenerated === true ? { aiGenerated: true, aiJobId: row.aiJobId as string } : {}) };
  });
}
