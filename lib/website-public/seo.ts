import type { Metadata } from "next";
import type { PublicSeo } from "./types";
export function publicMetadata(seo: PublicSeo): Metadata {
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical }, robots: seo.robots,
    openGraph: { title: seo.title, description: seo.description, url: seo.canonical, type: "website", images: seo.ogImage ? [{ url: new URL(seo.ogImage.src, seo.canonical).href, alt: seo.ogImage.alt }] : [] },
    twitter: { card: seo.ogImage ? "summary_large_image" : "summary", title: seo.title, description: seo.description, images: seo.ogImage ? [new URL(seo.ogImage.src, seo.canonical).href] : [] } };
}
export const previewMetadata: Metadata = { title: "RideGrid | Your car. Your price. Your choice.", description: "Find your next ride with RideGrid. Explore journeys and search current marketplace options.",
  robots: { index: false, follow: false }, openGraph: { title: "RideGrid", images: [] }, twitter: { card: "summary", images: [] } };
