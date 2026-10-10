import type { ReactNode } from "react";
import PageFactoryNavigation from "@/components/website-seo/page-factory/PageFactoryNavigation";

export default function PageFactoryLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-950"><PageFactoryNavigation />{children}</div>;
}
