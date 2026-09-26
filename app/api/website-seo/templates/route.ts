import {
  isWebsiteEntityType,
  type WebsiteEntityType,
} from "@/lib/website-seo/entities";

import {
  isWebsiteTemplateStatus,
  type CreateWebsitePageTemplateInput,
  type WebsiteTemplateStatus,
} from "@/lib/website-seo/templates";

import { websiteTemplateRepository } from "@/lib/website-seo/templates/repository";

import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawEntityType =
      searchParams.get("entityType");

    const rawStatus =
      searchParams.get("status");

    if (
      rawEntityType &&
      !isWebsiteEntityType(rawEntityType)
    ) {
      return websiteSeoApiError(
        "Invalid entity type.",
        400
      );
    }

    if (
      rawStatus &&
      !isWebsiteTemplateStatus(rawStatus)
    ) {
      return websiteSeoApiError(
        "Invalid template status.",
        400
      );
    }

    const entityType:
      | WebsiteEntityType
      | undefined =
      rawEntityType &&
      isWebsiteEntityType(rawEntityType)
        ? rawEntityType
        : undefined;

    const status:
      | WebsiteTemplateStatus
      | undefined =
      rawStatus &&
      isWebsiteTemplateStatus(rawStatus)
        ? rawStatus
        : undefined;

    const search =
      searchParams.get("search")?.trim() ||
      undefined;

    const templates =
      await websiteTemplateRepository.list({
        entityType,
        status,
        search,
      });

    return websiteSeoApiSuccess(templates);
  } catch (error) {
    console.error(
      "Website SEO template list failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load website templates."
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateWebsitePageTemplateInput;

    if (
      !body ||
      !isWebsiteEntityType(body.entityType)
    ) {
      return websiteSeoApiError(
        "Invalid entity type.",
        400
      );
    }

    const template =
      await websiteTemplateRepository.create(body);

    return websiteSeoApiSuccess(
      template,
      201
    );
  } catch (error) {
    console.error(
      "Website SEO template creation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create website template.";

    return websiteSeoApiError(
      message,
      400
    );
  }
}
