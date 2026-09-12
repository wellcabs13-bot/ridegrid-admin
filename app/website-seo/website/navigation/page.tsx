import WebsiteManagerNavigation from "@/components/website-seo/manager/WebsiteManagerNavigation";

import PublicNavigationManagerClient from "./PublicNavigationManagerClient";

export default function PublicNavigationManagerPage() {
  return (
    <>
      <WebsiteManagerNavigation />
      <PublicNavigationManagerClient />
    </>
  );
}