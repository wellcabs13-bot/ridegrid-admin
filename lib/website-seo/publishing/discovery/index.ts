import type { SeoPlan } from "../../seo/types";
import type { DiscoveryRecord, SitemapEntry } from "../types";

export function publicationDiscovery(status: string, plan: SeoPlan): DiscoveryRecord {
  const published = status === "PUBLISHED";
  const eligible = published && plan.indexability.indexable && plan.sitemapEligibility.eligible && plan.canonical.kind === "ABSOLUTE";
  return { published, crawlEligible: eligible, sitemapIncluded: eligible,
    url: { path: plan.canonical.path, absoluteUrl: plan.canonical.url }, internalLinks: eligible ? plan.internalLinks.map(l => l.path) : [] };
}
export function publicationSitemapEntry(discovery: DiscoveryRecord, lastmod?: Date): SitemapEntry | null {
  if (!discovery.sitemapIncluded || !discovery.url.absoluteUrl) return null;
  return { url: discovery.url.absoluteUrl, ...(lastmod ? { lastmod: lastmod.toISOString() } : {}) };
}
