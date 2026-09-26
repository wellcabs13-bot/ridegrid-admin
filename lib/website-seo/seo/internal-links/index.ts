import { normalizeSeoPath } from "../canonical";
import type { SeoInput, SeoLink } from "../types";

export function selectSeoLinks(input: SeoInput): SeoLink[] {
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();
  const currentPath = normalizeSeoPath(input.page.pathname, input.trailingSlash);
  return [...input.targets].sort((a, b) => a.page.pathname < b.page.pathname ? -1 : a.page.pathname > b.page.pathname ? 1 : 0)
    .flatMap(({ entity, page }): SeoLink[] => {
      const path = normalizeSeoPath(page.pathname, input.trailingSlash);
      if (!path || path === currentPath || page.id === input.page.id || page.entityId !== entity.id || entity.status !== "ACTIVE" ||
        page.status !== "PUBLISHED" || seenIds.has(page.id) || seenPaths.has(path)) return [];
      const suggestion = input.brief.internalLinks.find(l => l.pageId === page.id && l.entityId === entity.id && l.pathname === page.pathname);
      const reason = entity.id === input.entity.parentId ? "PARENT" : entity.parentId === input.entity.id ? "CHILD" :
        input.entity.parentId && entity.parentId === input.entity.parentId ? "SIBLING" : null;
      if (!reason || !suggestion || entity.name.trim().length > 100 || !entity.name.trim() || /[<>]/.test(entity.name)) return [];
      seenIds.add(page.id); seenPaths.add(path);
      return [{ pageId: page.id, entityId: entity.id, path, anchor: entity.name.trim(), reason }];
    }).slice(0, 8);
}
