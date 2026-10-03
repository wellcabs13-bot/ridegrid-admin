import type {
  WebsiteEntityType,
} from "@/lib/website-seo/entities";

export function createWebsiteGeneratedPageKey(
  entityType: WebsiteEntityType,
  entityId: string,
  templateId: string
): string {
  const cleanEntityId = entityId.trim();
  const cleanTemplateId = templateId.trim();

  if (!cleanEntityId) {
    throw new Error("Entity id is required.");
  }

  if (!cleanTemplateId) {
    throw new Error("Template id is required.");
  }

  return [
    entityType.toLowerCase(),
    cleanEntityId,
    cleanTemplateId,
  ].join(":");
}
