import type { ReactNode } from "react";

import WebsiteSeoShell from "@/components/website-seo/shell/WebsiteSeoShell";

export default function WebsiteSeoLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WebsiteSeoShell>{children}</WebsiteSeoShell>;
}
