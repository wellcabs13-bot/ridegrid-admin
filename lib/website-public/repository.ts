import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { loadStoredPublicPage } from "../website-seo/publishing/stored-public";
import { websitePublicNavigationRepository } from "../website-seo/public-navigation/repository";
import { websiteContentBlocksRepository } from "../website-seo/content-blocks/repository";
import { websiteMediaRepository } from "../website-seo/media/repository";
import { templateSectionsFromJson } from "../website-seo/pages/json";
import { publicNavigation } from "./navigation";
import { publicBlocks } from "./content-blocks";
import { publicMedia } from "./media";
import { toPublicPage } from "./page-model";
import type { PublicChrome } from "./types";

export const resolvePublicPage = cache(async (pathname: string) => {
  const stored = await loadStoredPublicPage(pathname);
  if (!stored) return null;
  return toPublicPage({ status: stored.snapshot.status, entityName: stored.snapshot.entity.name, entityType: stored.snapshot.entity.type,
    pathname: stored.snapshot.pathname, readiness: true, plan: stored.plan, content: stored.content,
    sections: templateSectionsFromJson(stored.snapshot.template.sections) });
});
export const resolvePublicChrome = cache(async (scope: "HOMEPAGE" | "GENERATED_PAGES"): Promise<PublicChrome> => {
  const [nav, blocks, media] = await Promise.all([websitePublicNavigationRepository.list(), websiteContentBlocksRepository.list(), websiteMediaRepository.list({ status: "ACTIVE", mimeType: "image" })]);
  return { navigation: publicNavigation(nav.items, nav.configured), blocks: publicBlocks(blocks.blocks, scope),
    media: media.items.flatMap(m => { const asset = publicMedia(m); return asset ? [{ category: m.category, asset }] : []; }) };
});
export const resolveDiscovery = cache(async () => {
  const candidates = await prisma.websiteSeoPage.findMany({ where: { status: "PUBLISHED", entity: { status: "ACTIVE" } }, select: { pathname: true }, orderBy: { updatedAt: "desc" }, take: 12 });
  // Small current inventory, checked through the same guard as detail routes.
  const checked = await Promise.all(candidates.map(p => resolvePublicPage(p.pathname)));
  return checked.flatMap(p => p ? [{ label: p.entityName, href: p.pathname, type: p.entityType, description: p.seo.description }] : []);
});
