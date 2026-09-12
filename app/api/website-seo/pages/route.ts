import {
  isWebsiteEntityType,
} from "@/lib/website-seo/entities";

import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  WEBSITE_GENERATED_PAGE_STATUSES,
  websitePageRepository,
} from "@/lib/website-seo/pages";

import type {
  WebsiteGeneratedPageStatus,
} from "@/lib/website-seo/pages";

function isPageStatus(
  value: string
): value is WebsiteGeneratedPageStatus {
  return (
    WEBSITE_GENERATED_PAGE_STATUSES as readonly string[]
  ).includes(value);
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const rawStatus =
      searchParams.get("status");

    const rawEntityType =
      searchParams.get("entityType");

    if (
      rawStatus &&
      !isPageStatus(rawStatus)
    ) {
      return websiteSeoApiError(
        "Invalid page status.",
        400
      );
    }

    if (
      rawEntityType &&
      !isWebsiteEntityType(rawEntityType)
    ) {
      return websiteSeoApiError(
        "Invalid entity type.",
        400
      );
    }

    const pages =
      await websitePageRepository.list({
        status:
          rawStatus && isPageStatus(rawStatus)
            ? rawStatus
            : undefined,

        entityType:
          rawEntityType &&
          isWebsiteEntityType(rawEntityType)
            ? rawEntityType
            : undefined,

        entityId:
          searchParams.get("entityId")?.trim() ||
          undefined,

        templateId:
          searchParams.get("templateId")?.trim() ||
          undefined,

        search:
          searchParams.get("search")?.trim() ||
          undefined,
      });

    return websiteSeoApiSuccess(pages);
  } catch (error) {
    console.error(
      "Website SEO page list failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load generated pages."
    );
  }
}
