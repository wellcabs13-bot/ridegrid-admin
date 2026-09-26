import type { Metadata } from "next";
import Homepage from "@/components/website-public/Homepage";
import { resolveHomepage } from "@/lib/website-public/homepage";
import { publicImageSlots } from "@/lib/website-seo/media/ai-image/public";

export async function generateMetadata(): Promise<Metadata> {
  const image = (await publicImageSlots("homepage")).ogImage;
  const images = image ? [{ url: new URL(image.src, "https://www.wellcabs.com").href, alt: image.alt }] : [];
  return { alternates: { canonical: "https://www.wellcabs.com/" }, openGraph: { title: "Wellcabs", description: "Search current cab, airport, local and outstation ride options.", url: "https://www.wellcabs.com/", type: "website", images }, twitter: { card: image ? "summary_large_image" : "summary", images } };
}

export const dynamic = "force-dynamic";

export default async function Page() {
  return <Homepage page={await resolveHomepage()} />;
}
