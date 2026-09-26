import type { SeoCanonical, SeoIndexability, SeoInput } from "../types";

export function decideSeoIndexability(input: SeoInput, canonical: SeoCanonical, technicalBlockers: string[] = []): SeoIndexability {
  const reasons = [...technicalBlockers];
  if (!["READY", "PUBLISHED"].includes(input.page.status)) reasons.push("PAGE_NOT_READY");
  if (input.entity.status !== "ACTIVE") reasons.push("ENTITY_NOT_ACTIVE");
  if (canonical.kind !== "ABSOLUTE") reasons.push("CANONICAL_NOT_ABSOLUTE");
  if (input.canonicalConflict) reasons.push("CANONICAL_CONFLICT");
  if (!input.content) reasons.push("CONTENT_MISSING");
  if (!input.contentQuality || input.contentQuality.status !== "PASS") reasons.push("CONTENT_REQUIRES_REVIEW");
  if (!input.editorialApproved) reasons.push("EDITORIAL_APPROVAL_REQUIRED");
  if (input.duplicateTitle || input.duplicateDescription) reasons.push("DUPLICATE_METADATA_RISK");
  const reasonCodes = [...new Set(reasons)].sort();
  return { indexable: reasonCodes.length === 0, robots: { index: reasonCodes.length === 0, follow: canonical.kind !== "INVALID" }, reasonCodes };
}
