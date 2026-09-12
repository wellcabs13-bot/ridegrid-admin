import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api";

import {
  bootstrapDefaultWebsiteTemplates,
} from "@/lib/website-seo/templates/bootstrap";

export async function POST() {
  try {
    const result =
      await bootstrapDefaultWebsiteTemplates();

    return websiteSeoApiSuccess(result);
  } catch (error) {
    console.error(
      "Website SEO default template bootstrap failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to bootstrap default website templates.";

    return websiteSeoApiError(
      message,
      500
    );
  }
}
