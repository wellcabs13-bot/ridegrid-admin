import { infoMetadata } from "@/components/website-public/InfoPage";
import ContactPage from "@/components/website-public/ContactPage";
import { resolvePhase1Chrome } from "@/lib/website-public/repository";
export const dynamic = "force-dynamic";
export const metadata = infoMetadata("contact");
export default async function Page() { const chrome=await resolvePhase1Chrome(); return <ContactPage navigation={chrome.navigation}/>; }
