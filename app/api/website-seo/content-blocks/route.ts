import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  websiteContentBlocksRepository,
  validateCreateWebsiteContentBlockInput,
} from "@/lib/website-seo/content-blocks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state =
      await websiteContentBlocksRepository.list();

    return websiteSeoApiSuccess(
      state
    );
  } catch (error) {
    console.error(
      "Website SEO content blocks read failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load content blocks."
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const input =
      validateCreateWebsiteContentBlockInput(
        body
      );

    const block =
      await websiteContentBlocksRepository.create(
        input
      );

    return websiteSeoApiSuccess(
      block,
      201
    );
  } catch (error) {
    console.error(
      "Website SEO content block creation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create content block.";

    return websiteSeoApiError(
      message,
      400
    );
  }
}