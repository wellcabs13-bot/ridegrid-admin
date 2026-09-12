import type { Metadata } from "next";
import PublicShell from "@/components/website-public/PublicShell";
import { websitePublicNavigationRepository } from "@/lib/website-seo/public-navigation/repository";
import { publicNavigation } from "@/lib/website-public/navigation";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find your ride | RideGrid", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const nav = await websitePublicNavigationRepository.list();
  return <PublicShell navigation={publicNavigation(nav.items, nav.configured)} contentIsMain>{children}</PublicShell>;
}
