import { prisma } from "@/lib/prisma";
import { normalizeSeoPath } from "../seo/canonical";
import { seoObject } from "../seo/engine/load";
import { isPublicationPath } from "./readiness";
import { publishingIndexingEngine } from "./engine";
import { escapeXml } from "./sitemap";
export async function publishedPageResponse(path: string): Promise<Response> {
  const normalized = normalizeSeoPath(path);
  const missing = () => new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
  if (!normalized || !isPublicationPath(normalized)) return missing();
  const page = await prisma.websiteSeoPage.findFirst({ where: { pathname: { in: [normalized, `${normalized}/`] }, status: "PUBLISHED" } });
  if (!page || seoObject(seoObject(page.metadata).publishing).engine !== "W7") return missing();
  try {
    const current = await publishingIndexingEngine.preview(page.entityId, page.id);
    if (!current.readiness.ready || !current.content) return missing();
    const { plan, content } = current;
    const e = escapeXml;
    const sections = content.sections.map(s => `<section><h2>${e(s.heading)}</h2>${s.paragraphs.map(p => `<p>${e(p)}</p>`).join("")}${s.benefits.map(p => `<p>${e(p)}</p>`).join("")}${Object.entries(s.context).map(([k, v]) => `<p>${e(k)}: ${e(v)}</p>`).join("")}${s.faqs.map(f => `<h3>${e(f.question)}</h3><p>${e(f.answer)}</p>`).join("")}</section>`).join("");
    const links = plan.internalLinks.map(l => `<li><a href="${e(l.path)}">${e(l.anchor)}</a></li>`).join("");
    const schema = JSON.stringify(plan.schema).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(plan.metadata.title)}</title><meta name="description" content="${e(plan.metadata.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${e(plan.canonical.url!)}"><script type="application/ld+json">${schema}</script></head><body><main><h1>${e(content.pageTitle)}</h1>${sections}${links ? `<nav aria-label="Related pages"><ul>${links}</ul></nav>` : ""}</main></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch { return missing(); }
}
