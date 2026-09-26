import type {
  UpdateWebsitePageTemplateInput,
} from "@/lib/website-seo/templates";

import { websiteTemplateRepository } from "@/lib/website-seo/templates/repository";

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

    const template =
      await websiteTemplateRepository.findById(id);

    if (!template) {
      return websiteSeoApiError(
        "Website template not found.",
        404
      );
    }

    return websiteSeoApiSuccess(template);
  } catch (error) {
    console.error(
      "Website SEO template read failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to load website template."
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
      (await request.json()) as UpdateWebsitePageTemplateInput;

    const template =
      await websiteTemplateRepository.update(
        id,
        body
      );

    if (!template) {
      return websiteSeoApiError(
        "Website template not found.",
        404
      );
    }

    return websiteSeoApiSuccess(template);
  } catch (error) {
    console.error(
      "Website SEO template update failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update website template.";

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
    const { id } = await context.params;

    const template =
      await websiteTemplateRepository.remove(id);

    if (!template) {
      return websiteSeoApiError(
        "Website template not found.",
        404
      );
    }

    return websiteSeoApiSuccess({
      id: template.id,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "Website SEO template deletion failed:",
      error
    );

    return websiteSeoApiError(
      "Unable to delete website template."
    );
  }
}
