import { websiteSeoApiError, websiteSeoApiSuccess } from "@/lib/website-seo/api";
import { websiteMediaRepository, WEBSITE_MEDIA_CATEGORIES, WEBSITE_MEDIA_STATUSES } from "@/lib/website-seo/media";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || undefined;
  const category = params.get("category") || undefined;
  if (status && !WEBSITE_MEDIA_STATUSES.some((item) => item === status)) return websiteSeoApiError("Invalid media status.", 400);
  if (category && !WEBSITE_MEDIA_CATEGORIES.some((item) => item === category)) return websiteSeoApiError("Invalid media category.", 400);
  try {
    return websiteSeoApiSuccess(await websiteMediaRepository.list({ search: params.get("search") || undefined, status, category, mimeType: params.get("mimeType") || undefined }));
  } catch (error) {
    console.error("Website media library read failed:", error);
    return websiteSeoApiError("Unable to load website media.");
  }
}
