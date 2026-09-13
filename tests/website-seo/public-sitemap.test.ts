// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../app/sitemap.xml/route";
vi.mock("../../lib/website-seo/publishing/engine", () => ({ publishingIndexingEngine: { sitemapEntries: vi.fn(async () => [{ url: "https://www.wellcabs.com/cities/pune" }]) } }));
describe("public sitemap", () => {
  it("includes the root and only W7 eligible inventory", async () => {
    const response = await GET(new NextRequest("https://www.wellcabs.com/sitemap.xml"));
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(xml).toContain("<loc>https://www.wellcabs.com/</loc>");
    expect(xml).toContain("<loc>https://www.wellcabs.com/cities/pune</loc>");
    expect(xml).not.toContain("/api/");
  });
  it("rejects malformed and missing chunks", async () => {
    expect((await GET(new NextRequest("https://www.wellcabs.com/sitemap.xml?chunk=-1"))).status).toBe(400);
    expect((await GET(new NextRequest("https://www.wellcabs.com/sitemap.xml?chunk=99"))).status).toBe(404);
  });
});
