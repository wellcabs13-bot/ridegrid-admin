import {
  websiteSeoApiError,
  websiteSeoApiSuccess,
} from "@/lib/website-seo/api/response";

export async function GET() {
  try {
    return websiteSeoApiSuccess({
      module: "website-seo",
      status: "READY",
      foundation: true,
    });
  } catch {
    return websiteSeoApiError(
      "Website & SEO health check failed."
    );
  }
}
