import WebsiteManagerNavigation from "@/components/website-seo/manager/WebsiteManagerNavigation";
import Link from "next/link";

import HomepageManagerClient from "./HomepageManagerClient";

export default function HomepageManagerPage() {
  return (
    <>
      <WebsiteManagerNavigation />
      <div className="mx-auto max-w-7xl px-6 pt-4"><Link className="text-sm font-bold text-red-600" href="/website-seo/website/media/ai-images?pageId=homepage">Generate and manage homepage images</Link></div>
      <HomepageManagerClient />
    </>
  );
}
