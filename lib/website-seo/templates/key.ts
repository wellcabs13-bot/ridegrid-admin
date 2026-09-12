import { createWebsiteEntitySlug } from "@/lib/website-seo/entities";

export function createWebsiteTemplateKey(
  value: string
): string {
  const key = createWebsiteEntitySlug(value);

  if (!key) {
    throw new Error("Template key cannot be empty.");
  }

  return key;
}
