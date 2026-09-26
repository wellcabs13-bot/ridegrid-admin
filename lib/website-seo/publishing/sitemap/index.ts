import type { SitemapEntry } from "../types";
export const escapeXml = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const header = '<?xml version="1.0" encoding="UTF-8"?>';
export function generateSitemapDocuments(entries: SitemapEntry[], sitemapUrl: string | null, chunkSize = 10000) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 50000) throw new Error("Invalid sitemap chunk size.");
  const unique = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    const url = new URL(entry.url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("Invalid sitemap canonical.");
    if (entry.lastmod && !Number.isFinite(Date.parse(entry.lastmod))) throw new Error("Invalid lastmod.");
    const previous = unique.get(url.href);
    if (!previous || (entry.lastmod ?? "") > (previous.lastmod ?? "")) unique.set(url.href, { ...entry, url: url.href });
  }
  const sorted = [...unique.values()].sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  const chunks: string[] = [];
  let rows: string[] = []; let bytes = 0;
  const flush = () => { chunks.push(`${header}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.join("")}</urlset>`); rows = []; bytes = 0; };
  for (const entry of sorted) {
    const row = `<url><loc>${escapeXml(entry.url)}</loc>${entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ""}</url>`;
    const size = Buffer.byteLength(row);
    if (size > 49000000) throw new Error("Sitemap entry exceeds size limit.");
    if (rows.length && (rows.length >= chunkSize || bytes + size > 49000000)) flush();
    rows.push(row); bytes += size;
  }
  if (rows.length || !chunks.length) flush();
  if (chunks.length > 1 && !sitemapUrl) throw new Error("Absolute sitemap URL is required for splitting.");
  const index = chunks.length > 1 ? `${header}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${chunks.map((_, i) =>
    `<sitemap><loc>${escapeXml(`${sitemapUrl}?chunk=${i}`)}</loc></sitemap>`).join("")}</sitemapindex>` : null;
  return { document: index ?? chunks[0], chunks, count: sorted.length };
}
