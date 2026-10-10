import { createHash } from "node:crypto";
import { validateContentQuality } from "../../content/quality";
import { resolveSeoCanonical } from "../canonical";
import { generateSeoMetadata } from "../metadata";
import { decideSeoIndexability } from "../indexability";
import { generateSeoSchema } from "../schema";
import { selectSeoLinks } from "../internal-links";
import { recommendSeoRedirects } from "../redirects";
import { seoSitemapEligibility } from "../sitemap";
import { validateSeoQuality } from "../quality";
import type { SeoInput, SeoPlan } from "../types";

export function createSeoPlan(input: SeoInput): SeoPlan {
  // Revalidate W5 content through W5 itself; a stale PASS flag must not authorize unsafe schema/indexing.
  if (input.content) {
    const checked = validateContentQuality(input.brief, input.content);
    const severity = { PASS: 0, REVIEW: 1, BLOCKED: 2 };
    if (!input.contentQuality || severity[checked.status] > severity[input.contentQuality.status]) {
      input = { ...input, contentQuality: checked };
    }
  }
  const canonical = resolveSeoCanonical(input.page.pathname, input.baseUrl, input.trailingSlash);
  const metadata = generateSeoMetadata(input, canonical);
  const internalLinks = selectSeoLinks(input);
  const indexability = decideSeoIndexability(input, canonical);
  const initial = { entity: { id: input.entity.id, name: input.entity.name, type: input.entity.type, status: input.entity.status },
    page: { id: input.page.id, entityId: input.page.entityId, templateId: input.page.templateId,
      pathname: input.page.pathname, status: input.page.status },
    metadata, canonical, indexability, schema: generateSeoSchema(input, metadata, canonical, internalLinks), internalLinks,
    redirectSignals: recommendSeoRedirects(input, canonical), sitemapEligibility: seoSitemapEligibility(input.page.status, canonical, indexability) };
  const firstQuality = validateSeoQuality(input, initial);
  initial.indexability = decideSeoIndexability(input, canonical, firstQuality.issues.map(issue => issue.code));
  initial.sitemapEligibility = seoSitemapEligibility(input.page.status, canonical, initial.indexability);
  const quality = validateSeoQuality(input, initial);
  const result = { ...initial, quality };
  return { ...result, generation: { engine: "W6", version: 1, ownership: "GENERATED_DRAFT",
    fingerprint: createHash("sha256").update(JSON.stringify(result)).digest("hex") } };
}
