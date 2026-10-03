import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  validateCreateWebsitePublicNavigationItemInput,
  websitePublicNavigationRepository,
} from "@/lib/website-seo/public-navigation";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const state =
      await websitePublicNavigationRepository.list();

    return websiteSeoApiSuccess(
      state
    );
  } catch (error) {
    console.error(
      "Website public navigation read failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load public navigation."
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
      validateCreateWebsitePublicNavigationItemInput(
        body
      );

    const item =
      await websitePublicNavigationRepository.create(
        input
      );

    return websiteSeoApiSuccess(
      item
    );
  } catch (error) {
    console.error(
      "Website public navigation creation failed:",
      error
    );

    return websiteSeoApiError(
      error instanceof Error
        ? error.message
        : "Unable to create navigation item.",
      400
    );
  }
}