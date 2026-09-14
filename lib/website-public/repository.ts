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
import { publicImageSlots } from "../website-seo/media/ai-image/public";

export const resolvePublicPage = cache(async (pathname: string) => {
  try {
  const stored = await loadStoredPublicPage(pathname);
  if (!stored) return null;
  const page = toPublicPage({ status: stored.snapshot.status, entityName: stored.snapshot.entity.name, entityType: stored.snapshot.entity.type,
    pathname: stored.snapshot.pathname, readiness: true, plan: stored.plan, content: stored.content,
    sections: templateSectionsFromJson(stored.snapshot.template.sections) });
  if (page) { page.images = await publicImageSlots(stored.snapshot.id); page.seo.ogImage = page.images.ogImage; }
  return page;
  } catch { return null; }
});
export const resolvePublicChrome = cache(async (scope: "HOMEPAGE" | "GENERATED_PAGES"): Promise<PublicChrome> => {
  try {
  const nav =
    await websitePublicNavigationRepository.list();

  const blocks =
    await websiteContentBlocksRepository.list();

  const media = await websiteMediaRepository.listPublic();
  const navigation = [];
  for (const link of publicNavigation(nav.items, nav.configured)) {
    const url = new URL(link.href, "https://www.wellcabs.com");
    if (["www.wellcabs.com", "wellcabs.com"].includes(url.hostname) && /^\/(routes|cities|services|airports|areas|vehicles)\//.test(url.pathname) && !await resolvePublicPage(url.pathname)) continue;
    navigation.push(link);
  }
  return { navigation: navigation.filter((link): link is NonNullable<typeof link> => link !== null), blocks: publicBlocks(blocks.blocks, scope),
    images: scope === "HOMEPAGE" ? await publicImageSlots("homepage") : {},
    media: media.flatMap(m => { const asset = publicMedia(m); return asset ? [{ category: m.category, asset }] : []; }) };
  } catch { return { navigation: publicNavigation([], false), blocks: [], media: [], images: {} }; }
});
export const resolveDiscovery = cache(async () => {
  const candidates = await prisma.websiteSeoPage.findMany({ where: { status: "PUBLISHED", entity: { status: "ACTIVE" } }, select: { pathname: true }, orderBy: { updatedAt: "desc" }, take: 12 });
  // Small current inventory, checked through the same guard as detail routes.
  const checked = [];
  for (const candidate of candidates) checked.push(await resolvePublicPage(candidate.pathname));
  return checked.flatMap(p => p ? [{ label: p.entityName, href: p.pathname, type: p.entityType, description: p.seo.description, image: p.images?.cardImage }] : []);
});
