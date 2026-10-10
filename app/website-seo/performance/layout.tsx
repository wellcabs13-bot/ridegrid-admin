import { Suspense, type ReactNode } from "react";
import PerformanceNavigation from "@/components/website-seo/performance/PerformanceNavigation";
export default function PerformanceLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-950"><Suspense fallback={<p role="status">Loading Performance…</p>}><PerformanceNavigation />{children}</Suspense></div>;
}
