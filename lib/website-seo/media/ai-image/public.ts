import { prisma } from "@/lib/prisma";
import { readImageState } from "./repository";
import { publicMedia } from "@/lib/website-public/media";
import type { PublicMedia } from "@/lib/website-public/types";
import type { WebsiteMedia } from "../types";
import { IMAGE_SLOTS, type ImageSlot } from "./types";

export type PublicImageSlots = Partial<Record<ImageSlot, PublicMedia>>;
// Read-only and fail-safe: neither provider configuration nor generation code
// participates in public requests. Approval never bypasses W7 page publication.
export async function publicImageSlots(pageId: string): Promise<PublicImageSlots> {
  try {
    return await prisma.$transaction(async tx => {
      const state = await readImageState(tx);
      const assigned = state.assignments.filter(a => a.pageId === pageId && IMAGE_SLOTS.includes(a.slot));
      if (!assigned.length) return {};
      const files = await tx.fileAsset.findMany({ where: { id: { in: assigned.map(a => a.assetId) }, entityType: "WEBSITE_MEDIA" } });
      const metadata = await tx.systemSetting.findUnique({ where: { settingKey: "website-seo.media-metadata" } });
      const items: WebsiteMedia[] = metadata ? JSON.parse(metadata.settingValue).items : [];
      const result: PublicImageSlots = {};
      for (const assignment of assigned) {
        const file = files.find(f => f.id === assignment.assetId);
        const meta = items.find(m => m.fileAssetId === assignment.assetId);
        if (!file || !meta || meta.status === "ARCHIVED") continue;
        if (assignment.jobId) {
          if (!state.jobs.some(j => j.id === assignment.jobId && j.assetId === file.id && j.status === "APPROVED")) continue;
        } else if (meta.status !== "ACTIVE" || meta.aiGenerated || meta.caption.startsWith("[AI-generated]")) continue;
        const asset = publicMedia({ ...meta, status: "ACTIVE", fileUrl: file.fileUrl, mimeType: file.mimeType, altText: assignment.altText });
        if (asset) result[assignment.slot] = { ...asset, caption: "" };
      }
      return result;
    }, { isolationLevel: "RepeatableRead" });
  } catch { return {}; }
}
