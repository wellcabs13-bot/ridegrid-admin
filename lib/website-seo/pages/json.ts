import type { Prisma } from "@prisma/client";

import type {
  WebsiteTemplateSection,
} from "@/lib/website-seo/templates";

export function jsonObjectOrNull(
  value: Prisma.JsonValue | null
): Record<string, unknown> | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

export function templateSectionsFromJson(
  value: Prisma.JsonValue
): WebsiteTemplateSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as unknown as WebsiteTemplateSection[];
}
