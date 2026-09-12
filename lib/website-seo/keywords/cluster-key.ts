import {
  normalizeWebsiteKeyword,
} from "./normalize";

export function createWebsiteKeywordClusterKey(
  value: string
): string {
  return normalizeWebsiteKeyword(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
