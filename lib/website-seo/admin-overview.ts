import "server-only";
import { prisma } from "@/lib/prisma";
import { INFO_PAGES } from "@/lib/website-public/info";
import { phase1Pages } from "@/lib/website-public/phase1";
import { publishingIndexingEngine } from "@/lib/website-seo/publishing/engine";

// Plain-language page inventory for the Website & SEO admin. It reports what
// RideGrid controls (published, indexable, canonical, sitemap) and never claims
// Google index status, which needs Search Console data that is not connected.

const BASE = "https://www.wellcabs.com";

export type SitePage = {
  id: string; name: string; type: string; url: string; path: string; status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  indexable: boolean; indexNote: string | null; canonical: string; inSitemap: boolean; updatedAt: string | null;
  seoScore: number; seoMissing: string[]; editHref: string;
};

function score(checks: [boolean, string][]) {
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { seoScore: Math.round(((checks.length - missing.length) / checks.length) * 100), seoMissing: missing };
}

function metaText(meta: unknown, ...paths: string[][]) {
  for (const path of paths) {
    let v: unknown = meta;
    for (const k of path) v = v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export async function sitePages(): Promise<SitePage[]> {
  const [dbPages, sitemap] = await Promise.all([
    prisma.websiteSeoPage.findMany({ select: { id: true, pathname: true, status: true, metadata: true, updatedAt: true, entity: { select: { type: true, name: true } } } }),
    publishingIndexingEngine.sitemapEntries().catch(() => [] as { url: string }[]),
  ]);
  const sitemapPaths = new Set(sitemap.map(e => new URL(e.url).pathname));
  const rows: SitePage[] = [];
  rows.push({ id: "home", name: "Homepage", type: "HOMEPAGE", url: `${BASE}/`, path: "/", status: "PUBLISHED", indexable: true, indexNote: null, canonical: `${BASE}/`, inSitemap: true, updatedAt: null, seoScore: 100, seoMissing: [], editHref: "/website-seo/website/homepage" });
  for (const p of INFO_PAGES) rows.push({
    id: `info-${p.slug}`, name: p.title, type: "LEGAL_INFO", url: `${BASE}/${p.slug}`, path: `/${p.slug}`, status: "PUBLISHED",
    indexable: !p.review, indexNote: p.review ? "Held back until business review is complete" : null, canonical: `${BASE}/${p.slug}`, inSitemap: !p.review, updatedAt: null,
    ...score([[!!p.title, "Title"], [p.description.length >= 50, "Meta description"]]), editHref: "/website-seo/website/pages",
  });
  const manifestPaths = new Set<string>();
  for (const p of phase1Pages) {
    manifestPaths.add(p.canonicalUrl);
    const ready = p.indexState === "READY_INDEX";
    rows.push({
      id: p.pageId, name: p.h1, type: p.pageType.toUpperCase(), url: BASE + p.canonicalUrl, path: p.canonicalUrl, status: "PUBLISHED",
      indexable: ready, indexNote: ready ? null : p.reasons.join("; ") || "Needs work before indexing", canonical: BASE + p.canonicalUrl, inSitemap: ready, updatedAt: null,
      ...score([[!!p.title && p.title.length <= 65, "Title (≤65 chars)"], [p.description.length >= 50 && p.description.length <= 170, "Meta description (50–170 chars)"], [!!p.h1, "H1"], [!!p.primaryKeyword, "Primary keyword"], [p.faqs.length > 0, "FAQs"], [p.links.length > 0, "Internal links"], [p.editorial.length > 0, "Editorial content"]]),
      editHref: "/website-seo/website/pages",
    });
  }
  for (const p of dbPages) {
    if (manifestPaths.has(p.pathname)) continue;
    const title = metaText(p.metadata, ["seo", "title"], ["title"]), description = metaText(p.metadata, ["seo", "description"], ["description"]);
    const canonical = metaText(p.metadata, ["seo", "canonical"], ["canonical"]) || BASE + p.pathname;
    const noindex = /noindex/i.test(metaText(p.metadata, ["seo", "robots"], ["robots"]));
    rows.push({
      id: p.id, name: p.entity.name, type: p.entity.type, url: BASE + p.pathname, path: p.pathname,
      status: p.status === "PUBLISHED" ? "PUBLISHED" : p.status === "DRAFT" ? "DRAFT" : "ARCHIVED",
      indexable: p.status === "PUBLISHED" && !noindex, indexNote: p.status !== "PUBLISHED" ? "Not published" : noindex ? "Marked noindex" : null,
      canonical, inSitemap: sitemapPaths.has(p.pathname), updatedAt: p.updatedAt.toISOString(),
      ...score([[!!title, "Title"], [description.length >= 50, "Meta description"], [canonical.startsWith(BASE), "Canonical URL"]]),
      editHref: "/website-seo/website/pages",
    });
  }
  return rows;
}

export async function siteOverview(f: { type?: string; status?: string; q?: string; page?: number }) {
  const all = await sitePages();
  const q = f.q?.trim().toLowerCase();
  const filtered = all.filter(p => (!f.type || p.type === f.type) && (!f.status || (f.status === "NOT_INDEXABLE" ? !p.indexable : p.status === f.status)) && (!q || p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)));
  const page = Math.max(f.page || 1, 1), pageSize = 50;
  const byType = [...new Set(all.map(p => p.type))].map(type => ({ type, total: all.filter(p => p.type === type).length, published: all.filter(p => p.type === type && p.status === "PUBLISHED").length }));
  return {
    totals: { pages: all.length, published: all.filter(p => p.status === "PUBLISHED").length, drafts: all.filter(p => p.status === "DRAFT").length, indexable: all.filter(p => p.indexable).length, inSitemap: all.filter(p => p.inSitemap).length, needsSeo: all.filter(p => p.seoScore < 100).length },
    byType,
    // Search Console is not connected; actual Google index status is unknown.
    googleIndexing: { connected: false, message: "Google indexing status unavailable until Search Console is connected." },
    rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}
