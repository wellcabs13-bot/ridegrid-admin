import type { ReactNode } from "react";

import Sidebar from "@/components/navigation/Sidebar";
import WebsiteSeoNavigation from "./WebsiteSeoNavigation";

interface WebsiteSeoShellProps {
  children: ReactNode;
}

export default function WebsiteSeoShell({
  children,
}: WebsiteSeoShellProps) {
  return (
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <header className="border-b border-zinc-800 bg-black">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                RideGrid
              </div>

              <div className="mt-1 text-xl font-black text-white">
                Website & SEO
              </div>
            </div>

            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300">
              View sitemap
            </a>
          </div>
        </header>

        <WebsiteSeoNavigation />

        <main>{children}</main>
      </div>
    </div>
  );
}
