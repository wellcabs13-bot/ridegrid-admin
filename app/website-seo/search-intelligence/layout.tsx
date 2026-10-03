import type { ReactNode } from "react";
import SearchIntelligenceNavigation from "@/components/website-seo/search-intelligence/SearchIntelligenceNavigation";
export default function SearchIntelligenceLayout({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-zinc-50 text-zinc-950"><SearchIntelligenceNavigation />{children}</div>; }
