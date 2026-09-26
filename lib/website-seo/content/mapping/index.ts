import type { ContentEntity, ContentLink, ContentPage } from "../types";

export function suggestContentLinks(entity: ContentEntity,
  candidates: { entity: ContentEntity; page: ContentPage }[]): ContentLink[] {
  const seen = new Set<string>();
  return [...candidates].sort((a, b) => a.page.pathname < b.page.pathname ? -1 : 1).flatMap(candidate => {
    const target = candidate.entity;
    const page = candidate.page;
    if (target.id === entity.id || page.entityId !== target.id || page.status !== "PUBLISHED" ||
      !/^\/(?!\/)/.test(page.pathname) || seen.has(page.id)) return [];
    const relationship: ContentLink["relationship"] | null = target.id === entity.parentId ? "PARENT" : target.parentId === entity.id ? "CHILD" :
      entity.parentId && target.parentId === entity.parentId ? "SIBLING" : null;
    if (!relationship) return [];
    seen.add(page.id);
    return [{ entityId: target.id, pageId: page.id, pathname: page.pathname, label: target.name, relationship }];
  }).slice(0, 8);
}
