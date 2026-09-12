"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Overview", "/website-seo/automation"],
  ["Workflows", "/website-seo/automation/workflows"],
  ["Rules", "/website-seo/automation/rules"],
  ["Schedules", "/website-seo/automation/schedules"],
  ["Activity", "/website-seo/automation/activity"],
  ["Failures", "/website-seo/automation/failures"],
] as const;

export default function AutomationNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b border-zinc-200 bg-white px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-3">
        {items.map(([label, href]) => {
          const active =
            href === "/website-seo/automation"
              ? pathname === href
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black ${
                active
                  ? "bg-red-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}