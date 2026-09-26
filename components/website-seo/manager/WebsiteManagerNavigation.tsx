"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Blocks,
  FileText,
  Home,
  Image,
  LayoutTemplate,
  Menu,
  Radio,
  Settings2,
} from "lucide-react";

const items = [
  {
    title: "Overview",
    href: "/website-seo/website",
    icon: Settings2,
    enabled: true,
  },
  {
    title: "Pages",
    href: "/website-seo/website/pages",
    icon: FileText,
    enabled: true,
  },
  {
    title: "Templates",
    href: "/website-seo/website/templates",
    icon: LayoutTemplate,
    enabled: true,
  },
  {
    title: "Homepage",
    href: "/website-seo/website/homepage",
    icon: Home,
    enabled: true,
  },
  {
    title: "Content Blocks",
    href: "/website-seo/website/content-blocks",
    icon: Blocks,
    enabled: true,
  },
  {
    title: "Navigation",
    href: "/website-seo/website/navigation",
    icon: Menu,
    enabled: true,
  },
  {
    title: "Media",
    href: "/website-seo/website/media",
    icon: Image,
    enabled: true,
  },
  {
    title: "Publishing",
    href: "/website-seo/website/publishing",
    icon: Radio,
    enabled: true,
  },
  { title: "AI Images", href: "/website-seo/website/media/ai-images", icon: Image, enabled: true },
] as const;

export default function WebsiteManagerNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 lg:px-8">
        {items.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/website-seo/website"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex shrink-0 cursor-default items-center gap-2 border-b-2 border-transparent px-3 py-3.5 text-sm font-bold text-zinc-400"
                title="Available in the next Website Manager development slice"
              >
                <Icon size={15} />
                {item.title}

                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-zinc-400">
                  Next
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-bold transition ${
                active
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-950"
              }`}
            >
              <Icon size={15} />
              {item.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
