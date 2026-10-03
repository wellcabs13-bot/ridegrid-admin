"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const searchTabs = [["", "Overview"], ["keywords", "Keywords"], ["clusters", "Clusters"], ["opportunities", "Opportunities"], ["competitors", "Competitors"], ["rankings", "Rankings"], ["ai-visibility", "AI Visibility"]] as const;
export default function SearchIntelligenceNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Search Intelligence" className="border-b border-zinc-200 bg-white"><div className="mx-auto flex max-w-7xl overflow-x-auto px-6">{searchTabs.map(([slug, label]) => { const href = `/website-seo/search-intelligence${slug ? `/${slug}` : ""}`; return <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3.5 text-sm font-bold ${pathname === href ? "border-red-600 text-red-600" : "border-transparent text-zinc-500"}`}>{label}</Link>; })}</div></nav>;
}
