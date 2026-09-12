import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  websiteContentBlocksRepository,
  validateUpdateWebsiteContentBlockInput,
} from "@/lib/website-seo/content-blocks";

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
    const { id } =
      await context.params;

    const block =
      await websiteContentBlocksRepository.findById(
        id
      );

    if (!block) {
      return websiteSeoApiError(
        "Content block not found.",
        404
      );
    }

    return websiteSeoApiSuccess(
      block
    );
  } catch (error) {
    console.error(
      "Website SEO content block read failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load content block."
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const body =
      await request.json();

    const input =
      validateUpdateWebsiteContentBlockInput(
        body
      );

    const block =
      await websiteContentBlocksRepository.update(
        id,
        input
      );

    if (!block) {
      return websiteSeoApiError(
        "Content block not found.",
        404
      );
    }

    return websiteSeoApiSuccess(
      block
    );
  } catch (error) {
    console.error(
      "Website SEO content block update failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update content block.";

    return websiteSeoApiError(
      message,
      400
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const block =
      await websiteContentBlocksRepository.archive(
        id
      );

    if (!block) {
      return websiteSeoApiError(
        "Content block not found.",
        404
      );
    }

    return websiteSeoApiSuccess({
      id: block.id,
      archived: true,
      status: block.status,
    });
  } catch (error) {
    console.error(
      "Website SEO content block archive failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to archive content block."
    );
  }
}