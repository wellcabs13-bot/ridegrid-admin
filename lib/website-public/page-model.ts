import type { GeneratedContent } from "../website-seo/content/types";
import type { SeoPlan, SeoSchema } from "../website-seo/seo/types";
import type { WebsiteTemplateSection } from "../website-seo/templates/types";
import type { PublicPage } from "./types";
import { publicHref } from "./safety";
export const ENTITY_ROUTES = { ROUTE: "routes", CITY: "cities", SERVICE: "services", AIRPORT: "airports", AREA: "areas", VEHICLE: "vehicles" } as const;
export function entityPath(type: string, slug: string) { const prefix = ENTITY_ROUTES[type as keyof typeof ENTITY_ROUTES]; return prefix && slug && !/[\/\\]/.test(slug) ? `/${prefix}/${encodeURIComponent(slug)}` : null; }
function publicSchema(schema: SeoSchema): SeoSchema {
  return { "@context": "https://schema.org", "@graph": schema["@graph"].map(n => {
    if (n["@type"] === "WebPage") return { "@type": n["@type"], "@id": n["@id"], url: n.url, name: n.name, description: n.description };
    if (n["@type"] === "BreadcrumbList") return { "@type": n["@type"], "@id": n["@id"], itemListElement: n.itemListElement.map(i => ({ "@type": i["@type"], position: i.position, name: i.name, item: i.item })) };
    return { "@type": n["@type"], "@id": n["@id"], mainEntity: n.mainEntity.map(q => ({ "@type": q["@type"], name: q.name, acceptedAnswer: { "@type": q.acceptedAnswer["@type"], text: q.acceptedAnswer.text } })) };
  }) };
}
export function toPublicPage(source: { status: string; entityName: string; entityType: string; pathname: string; readiness: boolean; plan: SeoPlan; content: GeneratedContent; sections: WebsiteTemplateSection[] }): PublicPage | null {
  if (source.status !== "PUBLISHED" || !source.readiness || !source.plan.indexability.indexable) return null;
  const { plan, content } = source;
  const links = plan.internalLinks.flatMap(l => { const href = publicHref(l.path); return href ? [{ label: l.anchor, href }] : []; });
  const allowed = new Map(links.map(l => [l.href, l]));
  const sections = source.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).flatMap(definition => {
    const s = content.sections.find(c => c.id === definition.id && c.type === definition.type);
    if (!s) return [];
    return [{ id: s.id, type: s.type, heading: s.heading,
      // Live bindings never become static claims about price, availability or reviews.
      paragraphs: s.binding ? [] : [...s.paragraphs, ...Object.entries(s.context).filter(([key]) => ["fromCity", "toCity", "originCity", "destinationCity", "city", "airportCode"].includes(key)).map(([key, value]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${value}`)], benefits: s.binding ? [] : s.benefits,
      faqs: s.faqs.filter(f => !f.binding).map(f => ({ question: f.question, answer: f.answer })),
      links: s.links.flatMap(l => { const href = publicHref(l.pathname); const link = href ? allowed.get(href) : null; return link ? [link] : []; }),
      cta: s.cta ? { label: s.cta.label, href: "#ride-search" } : null }];
  });
  return { title: content.pageTitle, entityName: source.entityName, entityType: source.entityType, pathname: source.pathname, sections, links,
    seo: { title: plan.metadata.title, description: plan.metadata.description, canonical: plan.canonical.url!,
      robots: { index: plan.indexability.robots.index, follow: plan.indexability.robots.follow },
      // W6 validation rejects unknown schema fields before this mapper is called.
      schema: publicSchema(plan.schema) },
    breadcrumbs: plan.schema["@graph"].flatMap(n => n["@type"] === "BreadcrumbList" ? n.itemListElement.map(i => ({ label: i.name, href: i.item })) : []),
  };
}
