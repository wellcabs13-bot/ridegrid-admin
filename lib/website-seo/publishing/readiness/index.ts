import type { SeoPlan } from "../../seo/types";
import type { PublicationReadiness } from "../types";

/** These W3 namespaces have no existing public business route handler; W7's handler owns their detail paths. */
export function isPublicationPath(path: string | null): boolean {
  return !!path && /^\/(routes|cities|services|airports|areas|vehicles)\/[^/]+\/?$/.test(path);
}
export function publicationReadiness(pageStatus: string, projected: SeoPlan, stored: { exists: boolean; indexable: boolean }, protectedPage = false): PublicationReadiness {
  const blockingIssues: PublicationReadiness["blockingIssues"] = [];
  const add = (code: string, message: string) => { blockingIssues.push({ code, message }); };
  if (!["READY", "PUBLISHED"].includes(pageStatus)) add("PAGE_NOT_READY", "Page must be READY before publication.");
  if (protectedPage) add("MANUAL_PROTECTION", "Publication is manually protected.");
  if (!stored.exists) add("SEO_PLAN_MISSING", "Persist an approved-quality W6 plan before publication.");
  else if (!stored.indexable) add("STORED_NOINDEX", "The stored W6 plan does not permit indexing.");
  if (projected.entity.status !== "ACTIVE") add("ENTITY_INACTIVE", "Entity must be active.");
  if (projected.quality.status !== "PASS") add("SEO_QUALITY", "W6 quality must pass without outstanding warnings.");
  if (!projected.indexability.indexable) add("NOINDEX", projected.indexability.reasonCodes.join(", "));
  if (!projected.sitemapEligibility.eligible) add("SITEMAP_INELIGIBLE", "Projected publication is not sitemap eligible.");
  if (projected.canonical.kind !== "ABSOLUTE") add("CANONICAL_INVALID", "A valid configured absolute canonical is required.");
  if (!isPublicationPath(projected.canonical.path)) add("PUBLIC_ROUTE_UNSUPPORTED", "The page path has no W7 public renderer.");
  return { ready: blockingIssues.length === 0, blockingIssues, warnings: projected.quality.warnings,
    reasonCodes: blockingIssues.map(i => i.code) };
}
