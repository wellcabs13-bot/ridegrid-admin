// @vitest-environment node
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Homepage from "../../components/website-public/Homepage";
import EntityPage from "../../components/website-public/EntityPage";
import ManagedImage from "../../components/website-public/ManagedImage";
import { homepagePresentation, resolveHomepage } from "../../lib/website-public/homepage";
import { publicMetadata } from "../../lib/website-public/seo";
import { websiteHomepageRepository } from "../../lib/website-seo/homepage/repository";
import { resolveDiscovery, resolvePublicChrome } from "../../lib/website-public/repository";
import type { PublicChrome, PublicPage } from "../../lib/website-public/types";

vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
vi.mock("../../components/website-public/PublicShell", async importOriginal => ({ ...await importOriginal<object>(), default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("../../components/website-public/HeroSearch", () => ({ default: () => <div id="ride-search">Search</div> }));
vi.mock("../../components/website-public/HomepageMarketplaceRoutes", () => ({ default: ({ media }: any) => <div>{media && <img src={media.src} alt={media.alt} />}</div> }));
vi.mock("../../lib/website-seo/homepage/repository", () => ({ websiteHomepageRepository: { get: vi.fn() } }));
vi.mock("../../lib/website-public/repository", () => ({ resolvePublicChrome: vi.fn(), resolveDiscovery: vi.fn() }));

const chrome: PublicChrome = { navigation: [], blocks: [], media: [] };
const image = (slot: string) => ({ src: `/api/files/${slot}`, alt: `Reviewed ${slot}`, caption: "" });
beforeEach(() => { vi.clearAllMocks(); });
describe("W19 public image rendering safety", () => {
  it("preserves the homepage and search with no assigned media", () => {
    const html = renderToStaticMarkup(<Homepage page={{ ...homepagePresentation(null), chrome, discovery: [] }} />);
    expect(html).toContain("Travel Further With Confidence"); expect(html).toContain("ride-search"); expect(html).not.toContain("/api/files/");
  });
  it("uses every managed homepage section without changing search links", () => {
    const images = Object.fromEntries(["heroImage", "cardImage", "sectionImage1", "sectionImage2", "featuredImage"].map(s => [s, image(s)]));
    const html = renderToStaticMarkup(<Homepage page={{ ...homepagePresentation(null), chrome: { ...chrome, images }, discovery: [] }} />);
    for (const slot of Object.keys(images)) expect(html).toContain(`/api/files/${slot}`);
    expect(html).toContain("/#ride-search"); expect(html).toContain("/marketplace");
  });
  it("keeps the existing global hero fallback when no page assignment exists", () => {
    const html = renderToStaticMarkup(<Homepage page={{ ...homepagePresentation(null), chrome: { ...chrome, media: [{ category: "HERO", asset: image("legacy-hero") }] }, discovery: [] }} />);
    expect(html).toContain("/api/files/legacy-hero");
  });
  it("renders page-specific hero and supporting images", () => {
    const page = { title: "Pune cab journeys", entityName: "Pune", entityType: "CITY", pathname: "/cities/pune", sections: [], links: [], breadcrumbs: [],
      seo: { title: "Pune", description: "City travel", canonical: "https://www.wellcabs.com/cities/pune", robots: { index: true, follow: true }, schema: {} },
      images: { heroImage: image("pune-hero"), sectionImage1: image("pune-support") } } as PublicPage;
    const html = renderToStaticMarkup(<EntityPage page={page} chrome={chrome} />);
    expect(html).toContain("/api/files/pune-hero"); expect(html).toContain("/api/files/pune-support");
    expect(renderToStaticMarkup(<ManagedImage />)).toBe("");
  });
  it("projects reviewed OG images with an absolute URL and preserves canonical", () => {
    const metadata = publicMetadata({ title: "Pune", description: "City journeys", canonical: "https://www.wellcabs.com/cities/pune", robots: { index: true, follow: true }, schema: {} as never, ogImage: image("social") });
    expect(metadata.alternates?.canonical).toBe("https://www.wellcabs.com/cities/pune");
    expect(metadata.openGraph?.images).toEqual([{ url: "https://www.wellcabs.com/api/files/social", alt: "Reviewed social" }]);
  });
  it("retains the homepage DB fail-safe", async () => {
    vi.mocked(websiteHomepageRepository.get).mockRejectedValue(new Error("DB offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fallback = await resolveHomepage();
    expect(fallback.chrome.media).toEqual([]); expect(fallback.chrome.images).toEqual({});
    expect(renderToStaticMarkup(<Homepage page={fallback} />)).toContain("ride-search");
  });
  it("preserves configured homepage when managed slots are empty", async () => {
    vi.mocked(websiteHomepageRepository.get).mockResolvedValue({ config: null } as never);
    vi.mocked(resolvePublicChrome).mockResolvedValue({ ...chrome, images: {} }); vi.mocked(resolveDiscovery).mockResolvedValue([]);
    const page = await resolveHomepage(); expect(page.hero.title).toBe("Travel Further With Confidence");
  });
});
