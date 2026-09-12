import type { WebsiteContentBlock } from "../website-seo/content-blocks/types";
import type { PublicBlock } from "./types";
import { publicHref } from "./safety";
export function publicBlocks(blocks: WebsiteContentBlock[], scope: "HOMEPAGE" | "GENERATED_PAGES"): PublicBlock[] {
  return [...blocks].filter(b => b.status === "ACTIVE" && (b.scope === scope || b.scope === "ALL_PUBLIC_PAGES"))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(b => {
      const href = publicHref(b.content.ctaHref);
      return { id: b.id, category: b.category, placement: b.placement, eyebrow: b.content.eyebrow, heading: b.content.heading, body: b.content.body,
        cta: href && b.content.ctaLabel ? { label: b.content.ctaLabel, href } : null };
    });
}
