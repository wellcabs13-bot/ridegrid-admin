import type { WebsiteEntityType } from "../../entities/types";

export interface KeywordEntity {
  id: string;
  type: WebsiteEntityType;
  name: string;
  metadata?: unknown;
}

/** Providers return search phrases, never inferred business facts or SEO metrics. */
export interface KeywordDiscoveryProvider {
  discover(entity: KeywordEntity): readonly string[];
}

function field(entity: KeywordEntity, key: string): string | undefined {
  const metadata = entity.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const deterministicKeywordDiscovery: KeywordDiscoveryProvider = {
  discover(entity) {
    const name = entity.name.trim();
    if (!name) return [];
    let bases: string[];
    switch (entity.type) {
      case "ROUTE": {
        const from = field(entity, "fromCity") ?? field(entity, "originCity");
        const to = field(entity, "toCity") ?? field(entity, "destinationCity");
        // Never guess endpoints by splitting arbitrary entity names.
        bases = from && to
          ? [`${from} to ${to} cab`, `${from} ${to} cab`, `${from} to ${to} taxi`,
             `${from} ${to} taxi`, `cab from ${from} to ${to}`, `taxi from ${from} to ${to}`]
          : [`${name} cab`, `${name} taxi`];
        break;
      }
      case "CITY":
      case "AREA": bases = [`cab in ${name}`, `taxi in ${name}`, `${name} cab`, `${name} taxi`]; break;
      case "AIRPORT": bases = [`${name} taxi`, `${name} cab`, `taxi to ${name}`, `cab to ${name}`]; break;
      case "SERVICE": bases = [name, `book ${name}`, `hire ${name}`]; break;
      case "VEHICLE": bases = [`${name} rental`, `hire ${name}`, `book ${name}`]; break;
    }
    const anchor = bases[0];
    return [...bases, `book ${anchor}`, `${anchor} fare`, `${anchor} price`,
      `${anchor} cost`, `how to book ${anchor}`];
  },
};
