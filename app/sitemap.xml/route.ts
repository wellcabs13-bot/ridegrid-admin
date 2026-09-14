import { NextRequest } from "next/server";
import { publishingIndexingEngine } from "@/lib/website-seo/publishing/engine";
import { generateSitemapDocuments } from "@/lib/website-seo/publishing/sitemap";
import { INFO_PAGES } from "@/lib/website-public/info";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const chunk = request.nextUrl.searchParams.get("chunk");
  if (chunk !== null && !/^(0|[1-9]\d*)$/.test(chunk)) return new Response("Invalid chunk", { status: 400 });
  const entries = await publishingIndexingEngine.sitemapEntries().catch(() => []);
  const result = generateSitemapDocuments([
    { url: "https://www.wellcabs.com/" },
    ...INFO_PAGES.filter(p => !p.review).map(p => ({ url: `https://www.wellcabs.com/${p.slug}` })),
    ...entries,
  ], "https://www.wellcabs.com/sitemap.xml");
  const xml = chunk === null ? result.document : result.chunks[Number(chunk)];
  if (!xml) return new Response("Sitemap chunk not found", { status: 404 });
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
}
