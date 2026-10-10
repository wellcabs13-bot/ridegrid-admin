"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
export default function PerformanceNavigation() {
  const pathname = usePathname(), params = useSearchParams();
  return <nav aria-label="Performance navigation" className="flex gap-2 overflow-x-auto border-b bg-white px-6 py-3">{["Overview", "Traffic", "Keywords", "Pages", "Conversions", "Revenue"].map(label => {
    const href = `/website-seo/performance${label === "Overview" ? "" : `/${label.toLowerCase()}`}`;
    return <Link key={label} href={`${href}?window=${encodeURIComponent(params.get("window") || "30D")}`} aria-current={pathname === href ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold ${pathname === href ? "bg-red-600 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>{label}</Link>;
  })}</nav>;
}
