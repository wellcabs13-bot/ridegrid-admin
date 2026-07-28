'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sidebarMenu } from '@/data/sidebar';

export default function Sidebar() {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<string[]>(['Dashboard']);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [title]
    );
  };

  return (
    <aside className="w-80 min-h-screen bg-slate-900 text-white flex flex-col shadow-2xl">
      {/* Logo */}

      <div className="px-6 py-6 border-b border-slate-800">
        <h1 className="text-3xl font-bold text-blue-400">RideGrid</h1>

        <p className="text-sm text-slate-400 mt-1">Fleet Management Platform</p>
      </div>

      {/* Navigation */}

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {sidebarMenu.map((menu) => {
          const isParentActive =
            pathname === menu.href || pathname.startsWith(menu.href ?? '');

          const isOpen = openMenus.includes(menu.title) || isParentActive;

          return (
            <div key={menu.title} className="mb-2">
              <button
                onClick={() => toggleMenu(menu.title)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all

                ${isParentActive ? 'bg-blue-600' : 'hover:bg-slate-800'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{menu.icon}</span>

                  <span className="font-medium">{menu.title}</span>
                </div>

                <span
                  className={`transition-transform duration-300

                  ${isOpen ? 'rotate-90' : ''}
                  `}
                >
                  ▶
                </span>
              </button>

              {isOpen && menu.children && (
                <div className="ml-8 mt-2 space-y-1">
                  {menu.children.map((sub) => {
                    const active = pathname === sub.href;

                    return (
                      <Link
                        key={sub.title}
                        href={sub.href}
                        className={`block px-4 py-2 rounded-lg text-sm transition-all

                        ${
                          active
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }

                        `}
                      >
                        {sub.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}

      <div className="border-t border-slate-800 p-5">
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="font-semibold">RideGrid Admin</h3>

          <p className="text-xs text-slate-400 mt-1">
            Enterprise Fleet Management
          </p>

          <div className="mt-3 text-xs text-green-400">● System Online</div>
        </div>
      </div>
    </aside>
  );
}
