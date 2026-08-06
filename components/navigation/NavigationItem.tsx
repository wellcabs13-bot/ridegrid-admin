'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  NavigationChild,
  NavigationItem as Item,
} from './navigation-types';

interface Props {
  item: Item;
}

export default function NavigationItem({
  item,
}: Props) {
  const pathname = usePathname();

  const Icon = item.icon;

  const hasChildren =
    !!item.children &&
    item.children.length > 0;

  const [open, setOpen] = useState(
    item.defaultOpen ?? false
  );

  const active =
    item.href &&
    (pathname === item.href ||
      pathname.startsWith(item.href + "/"));

  return (
    <div className="space-y-1">

      {/* Parent */}

      <div
        className={`flex items-center justify-between rounded-xl transition-all duration-200
        ${
          active
            ? "bg-blue-600 text-white"
            : "hover:bg-slate-800 text-slate-300"
        }`}
      >
        {item.href ? (
          <Link
            href={item.href}
            className="flex flex-1 items-center gap-3 px-4 py-3"
          >
            <Icon size={18} />

            <span className="font-medium">
              {item.title}
            </span>
          </Link>
        ) : (
          <div className="flex flex-1 items-center gap-3 px-4 py-3">
            <Icon size={18} />

            <span className="font-medium">
              {item.title}
            </span>
          </div>
        )}

        {hasChildren && (
          <button
            onClick={() => setOpen(!open)}
            className="mr-3 rounded p-1 hover:bg-slate-700"
          >
            {open ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        )}
      </div>

      {/* Children */}

      {hasChildren && open && (
        <div className="ml-8 space-y-1 border-l border-slate-700 pl-4">

          {item.children!.map(
            (child: NavigationChild) => {
              const childActive =
                child.href &&
                pathname === child.href;

              if (child.disabled) {
                return (
                  <div
                    key={child.title}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500"
                  >
                    <span>{child.title}</span>

                    {child.badge && (
                      <span className="rounded bg-yellow-500/20 px-2 py-1 text-[10px] font-semibold text-yellow-300">
                        {child.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={child.title}
                  href={child.href!}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm transition-all
                  ${
                    childActive
                      ? "bg-blue-500 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {child.title}
                </Link>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}