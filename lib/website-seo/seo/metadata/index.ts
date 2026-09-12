import type { SeoCanonical, SeoInput, SeoMetadata } from "../types";
const clean = (text: string) => text.trim().replace(/\s+/g, " ");

/** Retain complete W5 wording; flag excessive length in quality instead of cutting words. */
export function generateSeoMetadata(input: SeoInput, canonical: SeoCanonical): SeoMetadata {
  const title = clean(input.content?.seoCandidates.title ?? input.entity.name);
  const description = clean(input.content?.seoCandidates.metaDescription ?? "");
  const primary = input.brief.primaryKeyword;
  return { title, description, source: input.content ? "W5" : "ENTITY_FALLBACK",
    heading: clean(input.content?.pageTitle ?? input.entity.name),
    primaryKeyword: primary && primary.entityId === input.entity.id ? primary.keyword : null,
    openGraph: { title, description, type: "website", url: canonical.url } };
}
