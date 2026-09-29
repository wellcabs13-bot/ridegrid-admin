import type { Metadata } from "next";
import Homepage from "@/components/website-public/Homepage";
import { resolveHomepage } from "@/lib/website-public/homepage";
import { publicImageSlots } from "@/lib/website-seo/media/ai-image/public";
import { listMarketplaceOptions } from "@/lib/services/marketplace/MarketplaceOptionsService";

export async function generateMetadata(): Promise<Metadata> {
  const image = (await publicImageSlots("homepage")).ogImage;
  const images = image ? [{ url: new URL(image.src, "https://www.wellcabs.com").href, alt: image.alt }] : [];
  return {
    title: { absolute: "RideGrid by Wellcabs | Outstation, Local & Airport Cabs" },
    description: "Book outstation, round-trip, local and airport cabs with Wellcabs. Choose the exact car and driver, see the full fare, and travel with verified vendors and drivers.",
    alternates: { canonical: "https://www.wellcabs.com/" },
    openGraph: { title: "RideGrid by Wellcabs", description: "Choose the exact car and driver and see the full fare before you book.", url: "https://www.wellcabs.com/", type: "website", images },
    twitter: { card: image ? "summary_large_image" : "summary", images },
  };
}

export const dynamic = "force-dynamic";

export default async function Page() {
  // Options and page data load in parallel; a pricing outage never blocks the page
  // (the search then loads options in the browser and shows its own error state).
  const [page, options] = await Promise.all([resolveHomepage(), listMarketplaceOptions().catch(() => undefined)]);
  return <Homepage page={page} options={options} />;
}
