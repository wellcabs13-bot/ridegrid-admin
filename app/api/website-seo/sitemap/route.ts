import { NextRequest } from "next/server";
import { publishingIndexingEngine, sitemapAbsoluteUrl } from "@/lib/website-seo/publishing/engine";
import { generateSitemapDocuments } from "@/lib/website-seo/publishing/sitemap";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const chunk = request.nextUrl.searchParams.get("chunk");
  if (chunk !== null && !/^(0|[1-9]\d*)$/.test(chunk)) return new Response("Invalid chunk", { status: 400 });
  const result = generateSitemapDocuments(await publishingIndexingEngine.sitemapEntries(), sitemapAbsoluteUrl());
  const xml = chunk === null ? result.document : result.chunks[Number(chunk)];
  if (!xml) return new Response("Sitemap chunk not found", { status: 404 });
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
}
