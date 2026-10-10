import { normalizeSeoPath } from "../canonical";
import type { SeoCanonical, SeoInput, SeoRedirectResult } from "../types";

export function recommendSeoRedirects(input: SeoInput, canonical: SeoCanonical): SeoRedirectResult {
  const result: SeoRedirectResult = { recommendations: [], rejected: [] };
  if (!canonical.path || canonical.kind === "INVALID") return result;
  const seen = new Set<string>();
  const candidates = [...(input.historicalPaths ?? []).map(path => ({ path, reason: "HISTORICAL_PATH" as const })),
    ...(input.page.pathname !== canonical.path && !/[?#]/.test(input.page.pathname)
      ? [{ path: input.page.pathname, reason: "NORMALIZED_VARIANT" as const }] : [])];
  for (const { path, reason } of candidates) {
    const normalized = normalizeSeoPath(path, input.trailingSlash);
    let rejection: string | null = !normalized || /[?#]/.test(path) ? "INVALID_SOURCE" :
      path === canonical.path ? "REDIRECT_TO_SELF" : null;
    if (!rejection && reason === "HISTORICAL_PATH" && normalized === canonical.path) rejection = "REDIRECT_TO_SELF";
    if (!rejection && input.existingRedirects?.some(r => normalizeSeoPath(r.from, input.trailingSlash) === canonical.path)) rejection = "TARGET_REDIRECTS_CHAIN_OR_LOOP";
    if (!rejection && input.existingRedirects?.some(r => normalizeSeoPath(r.from, input.trailingSlash) === normalized &&
      normalizeSeoPath(r.to, input.trailingSlash) !== canonical.path)) rejection = "SOURCE_REDIRECT_CONFLICT";
    if (rejection) { result.rejected.push({ path, reason: rejection }); continue; }
    if (seen.has(path)) continue;
    seen.add(path);
    result.recommendations.push({ from: path, to: canonical.path, status: 308, reason });
  }
  result.recommendations.sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : 0);
  return result;
}
