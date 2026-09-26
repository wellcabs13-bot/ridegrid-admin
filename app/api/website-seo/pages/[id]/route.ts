import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  websitePageRepository,
} from "@/lib/website-seo/pages";

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

    const page =
      await websitePageRepository.findById(id);

    if (!page) {
      return websiteSeoApiError(
        "Generated page not found.",
        404
      );
    }

    return websiteSeoApiSuccess(page);
  } catch (error) {
    console.error(
      "Website SEO page read failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load generated page."
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const page =
      await websitePageRepository.remove(id);

    if (!page) {
      return websiteSeoApiError(
        "Generated page not found.",
        404
      );
    }

    return websiteSeoApiSuccess({
      id: page.id,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "Website SEO page deletion failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to delete generated page."
    );
  }
}
