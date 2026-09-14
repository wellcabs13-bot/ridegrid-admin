import type { ImageQuality, ImageSlot, ImageTarget } from "./types";
export function imageCostQuality(target: ImageTarget, slot: ImageSlot): ImageQuality {
  if (slot !== "heroImage") return "low";
  return target.family === "HOMEPAGE" || target.majorCommercial ? "high" : "medium";
}
export function retryDelay(attempt: number, retryAfterMs = 0) { return Math.min(300_000, Math.max(retryAfterMs, 5000 * 2 ** Math.min(Math.max(attempt - 1, 0), 6))); }
export class ImageRateLimitError extends Error {
  constructor(public readonly retryAfterMs = 0) { super("OpenAI rate limit reached. The queue will retry with backoff, up to three attempts."); }
}
