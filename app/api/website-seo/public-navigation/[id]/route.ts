import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  validateUpdateWebsitePublicNavigationItemInput,
  websitePublicNavigationRepository,
} from "@/lib/website-seo/public-navigation";

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

    const item =
      await websitePublicNavigationRepository.findById(
        id
      );

    if (!item) {
      return websiteSeoApiError(
        "Navigation item not found.",
        404
      );
    }

    return websiteSeoApiSuccess(
      item
    );
  } catch (error) {
    console.error(
      "Website navigation item read failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load navigation item."
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
      validateUpdateWebsitePublicNavigationItemInput(
        body
      );

    const item =
      await websitePublicNavigationRepository.update(
        id,
        input
      );

    if (!item) {
      return websiteSeoApiError(
        "Navigation item not found.",
        404
      );
    }

    return websiteSeoApiSuccess(
      item
    );
  } catch (error) {
    console.error(
      "Website navigation item update failed:",
      error
    );

    return websiteSeoApiError(
      error instanceof Error
        ? error.message
        : "Unable to update navigation item.",
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

    const item =
      await websitePublicNavigationRepository.remove(
        id
      );

    if (!item) {
      return websiteSeoApiError(
        "Navigation item not found.",
        404
      );
    }

    return websiteSeoApiSuccess({
      id: item.id,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "Website navigation item deletion failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to delete navigation item."
    );
  }
}