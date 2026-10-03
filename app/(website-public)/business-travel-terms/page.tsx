import InfoPage, { infoMetadata } from "@/components/website-public/InfoPage";
export const dynamic = "force-dynamic";
export const metadata = infoMetadata("business-travel-terms");
export default function Page() { return <InfoPage slug="business-travel-terms" />; }
