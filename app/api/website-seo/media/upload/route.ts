import { storeFile, validateFileType } from "@/lib/services/storage/FileStorageService";
import { websiteSeoApiError, websiteSeoApiSuccess } from "@/lib/website-seo/api";
import { validateMediaUpdate, websiteMediaRepository, WEBSITE_MEDIA_IMAGE_TYPES, WebsiteMediaValidationError } from "@/lib/website-seo/media";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || !file.name.trim()) return websiteSeoApiError("Choose a non-empty image file.", 400);
    if (!validateFileType(file.type, [...WEBSITE_MEDIA_IMAGE_TYPES])) return websiteSeoApiError("Choose a JPEG or PNG image.", 400);
    // Serving uses the extension, so it must agree with the supplied MIME type.
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!(file.type === "image/jpeg" ? extension === "jpg" || extension === "jpeg" : extension === "png")) {
      return websiteSeoApiError("The image filename must use the matching .jpg, .jpeg or .png extension.", 400);
    }
    const input = validateMediaUpdate({
      title: form.get("title") ?? file.name,
      altText: form.get("altText") ?? "",
      category: form.get("category") ?? "GENERAL",
    });
    const stored = await storeFile({ name: file.name, mimeType: file.type, content: Buffer.from(await file.arrayBuffer()) });
    // Storage is external to the DB transaction. On DB failure, retain the stored
    // file rather than introducing physical deletion into the media manager.
    return websiteSeoApiSuccess(await websiteMediaRepository.create(stored, input));
  } catch (error) {
    if (error instanceof WebsiteMediaValidationError || error instanceof TypeError) return websiteSeoApiError(error.message, 400);
    console.error("Website media upload failed:", error);
    return websiteSeoApiError("Unable to complete the media upload. Please try again.");
  }
}
