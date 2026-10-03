import InfoPage, { infoMetadata } from "@/components/website-public/InfoPage";
export const dynamic = "force-dynamic";
export const metadata = infoMetadata("about");
export default function Page() { return <InfoPage slug="about" />; }
