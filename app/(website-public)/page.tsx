import type { Metadata } from "next";
import Homepage from "@/components/website-public/Homepage";
import { resolveHomepage } from "@/lib/website-public/homepage";

export const metadata: Metadata = { alternates: { canonical: "https://www.wellcabs.com/" }, openGraph: { title: "RideGrid by Wellcabs", description: "Search current cab, airport, local and outstation ride options.", url: "https://www.wellcabs.com/", type: "website", images: [] } };

export const dynamic = "force-dynamic";

export default async function Page() {
  return <Homepage page={await resolveHomepage()} />;
}