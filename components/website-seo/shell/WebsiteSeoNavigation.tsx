"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { websiteSeoNavigation } from "@/lib/website-seo/navigation";

export default function WebsiteSeoNavigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 lg:px-8">
        {websiteSeoNavigation.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/website-seo"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-bold transition ${
                active
                  ? "border-red-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
