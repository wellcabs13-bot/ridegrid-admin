"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FACTORY_TYPES } from "@/lib/website-seo/page-factory/config";

export default function PageFactoryNavigation() {
  const pathname = usePathname();
  const root = "/website-seo/page-factory";
  const items = [{ label: "Overview", href: root }, ...FACTORY_TYPES.map((type) => ({ label: type.label, href: `${root}/${type.slug}` })), { label: "Bulk Generator", href: `${root}/bulk` }, { label: "Scale Control", href: `${root}/scale` }];
  return <nav aria-label="Page Factory" className="border-b border-zinc-200 bg-white"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 lg:px-8">{items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3.5 text-sm font-bold ${pathname === item.href ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-950"}`}>{item.label}</Link>)}</div></nav>;
}
