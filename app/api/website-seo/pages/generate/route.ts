import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  websitePageGenerationService,
} from "@/lib/website-seo/pages";

import type {
  GenerateWebsitePageInput,
} from "@/lib/website-seo/pages";

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as GenerateWebsitePageInput;

    if (!body?.entityId?.trim()) {
      return websiteSeoApiError(
        "Entity id is required.",
        400
      );
    }

    const result =
      await websitePageGenerationService.generateAndPersist(
        body
      );

    return websiteSeoApiSuccess(result);
  } catch (error) {
    console.error(
      "Website page generation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate website page.";

    const status =
      message === "Website entity not found." ||
      message.startsWith("No template available")
        ? 404
        : 400;

    return websiteSeoApiError(
      message,
      status
    );
  }
}
