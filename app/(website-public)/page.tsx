import Homepage from "@/components/website-public/Homepage";
import { resolveHomepage } from "@/lib/website-public/homepage";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <Homepage page={await resolveHomepage()} />;
}