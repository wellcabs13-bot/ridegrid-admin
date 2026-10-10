import { Prisma } from "@prisma/client";
import { websiteSeoApiError, websiteSeoApiSuccess } from "../api";
import { SearchIntelligenceInputError } from "./validation";

export async function searchIntelligenceResponse(work: () => Promise<unknown>, status = 200) {
  try { return websiteSeoApiSuccess(await work(), status); }
  catch (error) {
    if (error instanceof SearchIntelligenceInputError || error instanceof SyntaxError) return websiteSeoApiError(error.message, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (["P2021", "P2022"].includes(error.code)) return websiteSeoApiError("Search Intelligence storage is unavailable. The W10 migration must be applied separately before these records can be managed.", 503);
      if (error.code === "P2002") return websiteSeoApiError("A competitor with this normalized domain already exists.", 409);
      if (error.code === "P2025") return websiteSeoApiError("Record not found.", 404);
      if (error.code === "P2003") return websiteSeoApiError("A referenced record is unavailable.", 400);
    }
    console.error("Search Intelligence request failed:", error);
    return websiteSeoApiError("Unable to complete the Search Intelligence request.");
  }
}
export function queryChoice(params: URLSearchParams, key: string, choices: readonly string[]) {
  const value = params.get(key) || undefined;
  if (value && !choices.includes(value)) throw new SearchIntelligenceInputError(`Invalid ${key} filter.`);
  return value;
}
export function pageNumber(params: URLSearchParams, key: string, fallback: number, max: number) {
  const raw = params.get(key); if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) throw new SearchIntelligenceInputError(`Invalid ${key}.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > max || (key === "limit" && value < 1)) throw new SearchIntelligenceInputError(`Invalid ${key}.`);
  return value;
}
