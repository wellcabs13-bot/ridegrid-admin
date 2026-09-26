import { normalizeWebsiteKeyword } from "../../keywords/normalize";
import { resolveSeoCanonical } from "../canonical";
import type { SeoCanonical, SeoInput, SeoLink, SeoMetadata, SeoSchema, SeoSchemaNode } from "../types";

export function generateSeoSchema(input: SeoInput, metadata: SeoMetadata, canonical: SeoCanonical, links: SeoLink[]): SeoSchema {
  const graph: SeoSchemaNode[] = [];
  if (!canonical.url || !input.content || !metadata.title || !metadata.description || input.contentQuality?.status === "BLOCKED") return { "@context": "https://schema.org", "@graph": graph };
  graph.push({ "@type": "WebPage", "@id": `${canonical.url}#webpage`, url: canonical.url, name: metadata.title, description: metadata.description });
  const parent = links.find(link => link.reason === "PARENT");
  const parentUrl = parent ? resolveSeoCanonical(parent.path, input.baseUrl, input.trailingSlash).url : null;
  // A breadcrumb trail requires a real parent; never manufacture a homepage/category.
  if (parent && parentUrl) graph.push({ "@type": "BreadcrumbList", "@id": `${canonical.url}#breadcrumb`,
    itemListElement: [{ "@type": "ListItem", position: 1, name: parent.anchor, item: parentUrl },
      { "@type": "ListItem", position: 2, name: input.entity.name, item: canonical.url }] });
  const seen = new Set<string>();
  const faqs = (input.content?.sections.filter(s => s.type === "FAQ").flatMap(s => s.faqs) ?? [])
    .filter(faq => {
      const key = normalizeWebsiteKeyword(faq.question).replace(/[?!.]+$/g, "");
      if (!key || !faq.answer.trim() || faq.binding || seen.has(key)) return false;
      seen.add(key); return true;
    }).map(faq => ({ "@type": "Question" as const, name: faq.question.trim(),
      acceptedAnswer: { "@type": "Answer" as const, text: faq.answer.trim() } }));
  if (faqs.length) graph.push({ "@type": "FAQPage", "@id": `${canonical.url}#faq`, mainEntity: faqs });
  return { "@context": "https://schema.org", "@graph": graph };
}
