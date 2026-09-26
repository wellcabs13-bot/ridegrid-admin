import { websiteEntityRepository } from "../../entities/repository";
import { websiteKeywordRepository } from "../../keywords/repository";
import { websitePageRepository } from "../../pages/repository";
import { websiteTemplateRepository } from "../../templates/repository";
import { templateSectionsFromJson } from "../../pages/json";
import { validateWebsitePageTemplateInput } from "../../templates/validation";
import { ContentInputError } from "../types";
import { suggestContentLinks } from "../mapping";

export async function loadContentSources(entityId: string, pageId?: string) {
  const entity = await websiteEntityRepository.findById(entityId);
  if (!entity) throw new ContentInputError("Website entity not found.", 404);
  const pages = await websitePageRepository.list({ entityId });
  let page = pageId ? pages.find(p => p.id === pageId) ?? null : null;
  if (pageId && !page) throw new ContentInputError("Page does not belong to this entity.", 404);
  if (!pageId) {
    const eligible = pages.filter(p => p.status !== "ARCHIVED");
    if (eligible.length > 1) throw new ContentInputError("Multiple pages exist; select pageId.");
    page = eligible[0] ?? null;
  }
  const templates = page ? [page.template] : await websiteTemplateRepository.list({ entityType: entity.type, status: "ACTIVE" });
  if (templates.length !== 1) throw new ContentInputError("A single existing template is required; select a W3 page.");
  const template = templates[0];
  if (template.entityType !== entity.type || template.status === "ARCHIVED" || template.status === "INACTIVE") {
    throw new ContentInputError("Template is incompatible or inactive.");
  }
  const sections = templateSectionsFromJson(template.sections);
  try {
    if (sections.some(s => !s || typeof s.enabled !== "boolean")) throw new Error("Invalid template section.");
    validateWebsitePageTemplateInput({ name: template.name, entityType: template.entityType,
      pathPattern: template.pathPattern, status: template.status, sections });
  } catch { throw new ContentInputError("Existing template sections are invalid.", 422); }
  const keywords = await websiteKeywordRepository.list({ entityId });
  // Relationships come from W2 hierarchy; only existing published W3 targets are suggested.
  const targets = [...entity.children, ...(entity.parent ? [entity.parent] : [])];
  const candidates = (await Promise.all(targets.slice(0, 20).map(async target =>
    (await websitePageRepository.list({ entityId: target.id, status: "PUBLISHED" })).map(targetPage => ({ entity: target, page: targetPage }))
  ))).flat();
  return { entity, page, template, sections, keywords, links: suggestContentLinks(entity, candidates),
    revisions: { page: page?.updatedAt ?? null, entity: entity.updatedAt, template: template.updatedAt } };
}
