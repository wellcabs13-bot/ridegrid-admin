'use client';

import { useEffect, useState } from 'react';
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

function sectionSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function childHref(child: NavigationChild) {
  if (!child.href) return '#';

  const separator = child.href.includes('?') ? '&' : '?';

  return `${child.href}${separator}section=${sectionSlug(child.title)}`;
}

export default function NavigationItem({ item }: Props) {
  const pathname = usePathname();
  const Icon = item.icon;

  const hasChildren = Boolean(item.children?.length);

  const [open, setOpen] = useState(item.defaultOpen ?? false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  /*
   * Read the section query parameter only in the browser.
   * This avoids Next.js useSearchParams() CSR bailout requirements.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActiveSection(params.get('section'));
  }, [pathname]);

  const active =
    !hasChildren &&
    (
      item.href === '/'
        ? pathname === '/'
        : Boolean(item.href && pathname === item.href)
    );

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center justify-between rounded-xl transition-all duration-200 ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        {item.href ? (
          <Link
            href={item.href}
            className="flex flex-1 items-center gap-3 px-4 py-3"
          >
            <Icon size={18} />
            <span className="font-medium">{item.title}</span>
          </Link>
        ) : (
          <div className="flex flex-1 items-center gap-3 px-4 py-3">
            <Icon size={18} />
            <span className="font-medium">{item.title}</span>
          </div>
        )}

        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mr-3 rounded p-1 hover:bg-slate-700"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${item.title}`}
          >
            {open ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        )}
      </div>

      {hasChildren && open && (
        <div className="ml-8 space-y-1 border-l border-slate-700 pl-4">
          {item.children!.map((child: NavigationChild) => {
            if (child.disabled || !child.href) {
              return null;
            }

            const section = sectionSlug(child.title);
            const href = childHref(child);

            const childActive =
              pathname === child.href &&
              activeSection === section;

            return (
              <Link
                key={child.title}
                href={href}
                onClick={() => setActiveSection(section)}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  childActive
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {child.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
