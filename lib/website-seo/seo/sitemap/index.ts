import type { SeoCanonical, SeoIndexability, SeoSitemap } from "../types";

export function seoSitemapEligibility(pageStatus: string, canonical: SeoCanonical, indexability: SeoIndexability): SeoSitemap {
  const reasonCodes = [...indexability.reasonCodes];
  if (pageStatus !== "PUBLISHED") reasonCodes.push("NOT_PUBLISHED");
  if (canonical.kind !== "ABSOLUTE") reasonCodes.push("CANONICAL_NOT_ABSOLUTE");
  return { eligible: reasonCodes.length === 0 && indexability.indexable, reasonCodes: [...new Set(reasonCodes)].sort(),
    canonicalPath: canonical.path, indexable: indexability.indexable, pageStatus };
}
