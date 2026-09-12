import type { WebsiteMedia } from "../website-seo/media/types";
import type { PublicMedia } from "./types";
export function publicMedia(item: WebsiteMedia | null | undefined): PublicMedia | null {
  if (!item || item.status !== "ACTIVE" || !item.altText.trim() || !["image/jpeg", "image/png"].includes(item.mimeType || "")) return null;
  // Serve only FileAsset URLs already joined by the W8 Website Media repository.
  if (!/^\/api\/files\/[a-zA-Z0-9_-]+$/.test(item.fileUrl)) return null;
  return { src: item.fileUrl, alt: item.altText, caption: item.caption };
}
