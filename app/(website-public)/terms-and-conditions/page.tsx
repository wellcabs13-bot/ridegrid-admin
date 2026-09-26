import InfoPage, { infoMetadata } from "@/components/website-public/InfoPage";
export const dynamic = "force-dynamic";
export const metadata = infoMetadata("terms-and-conditions");
export default function Page() { return <InfoPage slug="terms-and-conditions" />; }
