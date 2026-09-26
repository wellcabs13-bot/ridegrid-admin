import InfoPage, { infoMetadata } from "@/components/website-public/InfoPage";
export const dynamic = "force-dynamic";
export const metadata = infoMetadata("privacy-policy");
export default function Page() { return <InfoPage slug="privacy-policy" />; }
