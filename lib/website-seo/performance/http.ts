import { websiteSeoApiError, websiteSeoApiSuccess } from "../api";
import { performanceReport } from "./repository";
export async function performanceResponse(request: Request, section: string) {
  try { return websiteSeoApiSuccess(await performanceReport(section, new URL(request.url).searchParams)); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid ")) return websiteSeoApiError(error.message, 400);
    console.error("Performance report failed", error);
    return websiteSeoApiError("Performance data is unavailable. Retry loading the report.", 503);
  }
}
