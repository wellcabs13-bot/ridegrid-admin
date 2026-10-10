export interface KeywordPage {
  id: string;
  entityId: string;
  pathname: string;
  status: string;
}

/** Ambiguous entities remain unmapped; never choose an arbitrary template/page. */
export function mapKeywordPage(entityId: string, pages: readonly KeywordPage[]) {
  const eligible = pages.filter(page => page.entityId === entityId && page.status !== "ARCHIVED");
  const published = eligible.filter(page => page.status === "PUBLISHED");
  const choices = published.length ? published : eligible;
  return choices.length === 1 ? { id: choices[0].id, pathname: choices[0].pathname } : null;
}
