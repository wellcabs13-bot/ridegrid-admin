import type { Metadata } from "next";
import type { PublicSeo } from "./types";
export function publicMetadata(seo: PublicSeo): Metadata {
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical }, robots: seo.robots,
    openGraph: { title: seo.title, description: seo.description, url: seo.canonical, type: "website", images: [] },
    twitter: { card: "summary", title: seo.title, description: seo.description, images: [] } };
}
export const previewMetadata: Metadata = { title: "RideGrid | Your car. Your price. Your choice.", description: "Find your next ride with RideGrid. Explore journeys and search current marketplace options.",
  robots: { index: false, follow: false }, openGraph: { title: "RideGrid", images: [] }, twitter: { card: "summary", images: [] } };
