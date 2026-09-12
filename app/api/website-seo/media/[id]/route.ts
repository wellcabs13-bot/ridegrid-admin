import { websiteSeoApiError, websiteSeoApiSuccess } from "@/lib/website-seo/api";
import { validateMediaUpdate, websiteMediaRepository, WebsiteMediaValidationError } from "@/lib/website-seo/media";

// Stable identifier: FileAsset.id.
interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = validateMediaUpdate(await request.json());
    const item = await websiteMediaRepository.update(id, input);
    return item ? websiteSeoApiSuccess(item) : websiteSeoApiError("Website media not found.", 404);
  } catch (error) {
    if (error instanceof WebsiteMediaValidationError || error instanceof SyntaxError) return websiteSeoApiError(error.message, 400);
    console.error("Website media update failed:", error);
    return websiteSeoApiError("Unable to save website media.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await websiteMediaRepository.archive(id);
    return item ? websiteSeoApiSuccess(item) : websiteSeoApiError("Website media not found.", 404);
  } catch (error) {
    console.error("Website media archive failed:", error);
    return websiteSeoApiError("Unable to archive website media.");
  }
}
