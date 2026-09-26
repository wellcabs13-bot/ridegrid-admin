import {
  type UpdateWebsiteEntityInput,
} from "@/lib/website-seo/entities";
import { websiteEntityRepository } from "@/lib/website-seo/entities/repository";
import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const entity =
      await websiteEntityRepository.findById(id);

    if (!entity) {
      return websiteSeoApiError(
        "Website entity not found.",
        404
      );
    }

    return websiteSeoApiSuccess(entity);
  } catch (error) {
    console.error("Website SEO entity read failed:", error);

    return websiteSeoApiError(
      "Unable to load website entity."
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const body =
      (await request.json()) as UpdateWebsiteEntityInput;

    const entity =
      await websiteEntityRepository.update(id, body);

    if (!entity) {
      return websiteSeoApiError(
        "Website entity not found.",
        404
      );
    }

    return websiteSeoApiSuccess(entity);
  } catch (error) {
    console.error("Website SEO entity update failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update website entity.";

    return websiteSeoApiError(message, 400);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const entity =
      await websiteEntityRepository.remove(id);

    if (!entity) {
      return websiteSeoApiError(
        "Website entity not found.",
        404
      );
    }

    return websiteSeoApiSuccess({
      id: entity.id,
      deleted: true,
    });
  } catch (error) {
    console.error("Website SEO entity deletion failed:", error);

    return websiteSeoApiError(
      "Unable to delete website entity."
    );
  }
}
