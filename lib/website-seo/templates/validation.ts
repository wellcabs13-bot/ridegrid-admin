import {
  WEBSITE_TEMPLATE_SECTION_TYPES,
  WEBSITE_TEMPLATE_STATUSES,
  type CreateWebsitePageTemplateInput,
  type WebsiteTemplateSection,
  type WebsiteTemplateSectionType,
  type WebsiteTemplateStatus,
} from "./types";

export function isWebsiteTemplateStatus(
  value: unknown
): value is WebsiteTemplateStatus {
  return (
    typeof value === "string" &&
    WEBSITE_TEMPLATE_STATUSES.includes(
      value as WebsiteTemplateStatus
    )
  );
}

export function isWebsiteTemplateSectionType(
  value: unknown
): value is WebsiteTemplateSectionType {
  return (
    typeof value === "string" &&
    WEBSITE_TEMPLATE_SECTION_TYPES.includes(
      value as WebsiteTemplateSectionType
    )
  );
}

export function validateWebsiteTemplateSection(
  section: WebsiteTemplateSection
): void {
  if (!section.id?.trim()) {
    throw new Error("Template section id is required.");
  }

  if (!isWebsiteTemplateSectionType(section.type)) {
    throw new Error(
      `Invalid template section type: ${String(section.type)}`
    );
  }

  if (
    !Number.isInteger(section.order) ||
    section.order < 0
  ) {
    throw new Error(
      "Template section order must be a non-negative integer."
    );
  }
}

export function validateWebsitePageTemplateInput(
  input: CreateWebsitePageTemplateInput
): void {
  if (!input.name?.trim() || input.name.trim().length < 2) {
    throw new Error(
      "Template name must contain at least 2 characters."
    );
  }

  if (!input.pathPattern?.trim()) {
    throw new Error("Template path pattern is required.");
  }

  if (!input.pathPattern.includes("{slug}")) {
    throw new Error(
      'Template path pattern must contain "{slug}".'
    );
  }

  if (
    input.status !== undefined &&
    !isWebsiteTemplateStatus(input.status)
  ) {
    throw new Error("Invalid template status.");
  }

  const sections = input.sections ?? [];
  const sectionIds = new Set<string>();
  const sectionOrders = new Set<number>();

  for (const section of sections) {
    validateWebsiteTemplateSection(section);

    if (sectionIds.has(section.id)) {
      throw new Error(
        `Duplicate template section id: ${section.id}`
      );
    }

    if (sectionOrders.has(section.order)) {
      throw new Error(
        `Duplicate template section order: ${section.order}`
      );
    }

    sectionIds.add(section.id);
    sectionOrders.add(section.order);
  }
}
