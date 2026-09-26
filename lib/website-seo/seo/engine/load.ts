import nextConfig from "@/next.config";
import { prisma } from "@/lib/prisma";
import { loadContentSources } from "../../content/engine/load";
import { buildContentBrief } from "../../content/brief";
import { parseGeneratedContent } from "../../content/generation/validate";
import { validateContentQuality, copyFingerprint } from "../../content/quality";
import { websiteContentRepository } from "../../content/repository";
import { normalizeSeoPath } from "../canonical";
import { SeoInputError, type SeoInput } from "../types";
import type { GeneratedContent } from "../../content/types";

export function seoObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export async function loadSeoInput(entityId: string, pageId?: string): Promise<{ input: SeoInput; revision: Date }> {
  const source = await loadContentSources(entityId, pageId);
  if (!source.page) throw new SeoInputError("An existing W3 page is required.");
  const brief = buildContentBrief({ ...source, templateId: source.template.id });
  const metadata = seoObject(source.page.metadata);
  const stored = seoObject(metadata.contentW5);
  const result = seoObject(stored.result);
  let content: GeneratedContent | null = null;
  if (stored.engine === "W5" && seoObject(result.entity).id === source.entity.id &&
    seoObject(result.page).id === source.page.id && seoObject(result.brief).templateId === source.template.id) {
    try { content = parseGeneratedContent({ pageTitle: result.pageTitle, seoCandidates: result.seoCandidates, sections: result.sections }); }
    catch { /* Malformed stored content is a visible missing-content blocker, never trusted. */ }
  }
  const duplicateContent = content ? await websiteContentRepository.hasDuplicateCopy(copyFingerprint(content), source.page.id) : false;
  const contentQuality = content ? validateContentQuality(brief, content, duplicateContent) : null;
  const targetIds = brief.internalLinks.map(l => l.pageId);
  const targetPages = targetIds.length ? await prisma.websiteSeoPage.findMany({ where: { id: { in: targetIds } }, include: { entity: true } }) : [];
  const trailingSlash = "trailingSlash" in nextConfig && nextConfig.trailingSlash === true;
  const pagePaths = await prisma.websiteSeoPage.findMany({ select: { id: true, pathname: true } });
  const path = normalizeSeoPath(source.page.pathname, trailingSlash);
  const canonicalConflict = path !== null && pagePaths.some(p => p.id !== source.page!.id && normalizeSeoPath(p.pathname, trailingSlash) === path);
  const history = Array.isArray(metadata.previousPathnames) ? metadata.previousPathnames.filter((p): p is string => typeof p === "string") : [];
  const existingRedirects = Array.isArray(metadata.redirectRecommendations) ? metadata.redirectRecommendations.flatMap(value => {
    const rule = seoObject(value);
    return typeof rule.from === "string" && typeof rule.to === "string" ? [{ from: rule.from, to: rule.to }] : [];
  }) : [];
  return { input: { entity: source.entity, page: source.page, brief, content, contentQuality,
    editorialApproved: stored.editorialStatus === "APPROVED" || stored.editorialStatus === "PUBLISHED",
    keywords: source.keywords, targets: targetPages.map(page => ({ entity: page.entity, page })),
    baseUrl: process.env.WEBSITE_SEO_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || undefined,
    trailingSlash, canonicalConflict, historicalPaths: history, existingRedirects }, revision: source.page.updatedAt };
}
