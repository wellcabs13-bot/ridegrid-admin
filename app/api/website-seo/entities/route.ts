import {
  isWebsiteEntityStatus,
  isWebsiteEntityType,
  type CreateWebsiteEntityInput,
  type WebsiteEntityStatus,
  type WebsiteEntityType,
} from "@/lib/website-seo/entities";

import { websiteEntityRepository } from "@/lib/website-seo/entities/repository";

import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawType = searchParams.get("type");
    const rawStatus = searchParams.get("status");

    if (rawType && !isWebsiteEntityType(rawType)) {
      return websiteSeoApiError(
        "Invalid entity type.",
        400
      );
    }

    if (rawStatus && !isWebsiteEntityStatus(rawStatus)) {
      return websiteSeoApiError(
        "Invalid entity status.",
        400
      );
    }

    const type: WebsiteEntityType | undefined =
      rawType && isWebsiteEntityType(rawType)
        ? rawType
        : undefined;

    const status: WebsiteEntityStatus | undefined =
      rawStatus && isWebsiteEntityStatus(rawStatus)
        ? rawStatus
        : undefined;

    const search =
      searchParams.get("search")?.trim() || undefined;

    const parentId =
      searchParams.get("parentId")?.trim() || undefined;

    const entities = await websiteEntityRepository.list({
      type,
      status,
      search,
      parentId,
    });

    return websiteSeoApiSuccess(entities);
  } catch (error) {
    console.error(
      "Website SEO entity list failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load website entities."
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateWebsiteEntityInput;

    if (!body || !isWebsiteEntityType(body.type)) {
      return websiteSeoApiError(
        "Invalid entity type.",
        400
      );
    }

    const entity =
      await websiteEntityRepository.create(body);

    return websiteSeoApiSuccess(entity, 201);
  } catch (error) {
    console.error(
      "Website SEO entity creation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create website entity.";

    return websiteSeoApiError(message, 400);
  }
}
