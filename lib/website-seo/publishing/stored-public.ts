import { prisma } from "@/lib/prisma";
import { normalizeSeoPath } from "../seo/canonical";
import { loadSeoInput, seoObject } from "../seo/engine/load";
import { validateSeoQuality } from "../seo/quality";
import { decideSeoIndexability } from "../seo/indexability";
import { seoSitemapEligibility } from "../seo/sitemap";
import { websiteSeoPlanRepository } from "../seo/repository";
import type { SeoPlan } from "../seo/types";
import { isPublicationPath, publicationReadiness } from "./readiness";
import { publicationProtected, publicationRevision, publicationSnapshot } from "./repository";

/** W14 read-only adapter. Revalidate stored W5/W6 through existing validators;
 * never call createSeoPlan, a content provider, or any persistence operation.
 * The original W7 publishing engine and catch-all are unchanged. */
export async function loadStoredPublicPage(path: string) {
  const normalized = normalizeSeoPath(path);
  if (!normalized || !isPublicationPath(normalized)) return null;
  const row = await prisma.websiteSeoPage.findFirst({ where: { pathname: { in: [normalized, `${normalized}/`] }, status: "PUBLISHED" }, select: { id: true, entityId: true } });
  if (!row) return null;
  try {
    const snapshot = await publicationSnapshot(row.id, row.entityId);
    const metadata = seoObject(snapshot.metadata), stored = seoObject(metadata.seoW6);
    if (snapshot.status !== "PUBLISHED" || seoObject(metadata.publishing).engine !== "W7" || stored.engine !== "W6" || publicationProtected(metadata)) return null;
    const plan = stored.plan as SeoPlan;
    if (!plan || plan.page.id !== snapshot.id || plan.entity.id !== snapshot.entityId || plan.page.templateId !== snapshot.templateId ||
      !plan.indexability.indexable || plan.quality.status !== "PASS" || normalizeSeoPath(plan.canonical.path || "") !== normalized) return null;
    const loaded = await loadSeoInput(snapshot.entityId, snapshot.id);
    if (!loaded.input.content || loaded.revision.getTime() !== snapshot.updatedAt.getTime()) return null;
    const duplicate = await websiteSeoPlanRepository.duplicateMetadata(snapshot.id, plan.metadata.title, plan.metadata.description);
    const input = { ...loaded.input, ...duplicate };
    const indexability = decideSeoIndexability(input, plan.canonical);
    // Only lifecycle eligibility is projected. Customer SEO remains the persisted W6 plan.
    const checked = { ...plan, entity: { ...plan.entity, status: input.entity.status }, page: input.page,
      indexability, sitemapEligibility: seoSitemapEligibility(snapshot.status, plan.canonical, indexability) };
    const quality = validateSeoQuality(input, checked);
    const readiness = publicationReadiness(snapshot.status, { ...checked, quality }, { exists: true, indexable: plan.indexability.indexable }, publicationProtected(metadata));
    if (!readiness.ready || publicationRevision(await publicationSnapshot(row.id, row.entityId)) !== publicationRevision(snapshot)) return null;
    return { snapshot, plan, content: input.content! };
  } catch { return null; } // Malformed, stale, protected or unavailable content fails closed like W7.
}
