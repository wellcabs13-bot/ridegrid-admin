'use client';

import {
  Bell,
  Search,
  Settings,
  Plus,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  const pageName =
    pathname === '/'
      ? 'Dashboard'
      : pathname
          .split('/')
          .filter(Boolean)
          .map(
            (item) =>
              item.charAt(0).toUpperCase() + item.slice(1)
          )
          .join(' / ');

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <p className="text-sm text-slate-500">
          Welcome back 👋
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {pageName}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden lg:block">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search bookings, customers..."
            className="w-80 rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <Link
          href="/marketplace"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Booking
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100"
        >
          <Settings size={20} />
        </Link>

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100"
        >
          <Bell size={20} />

          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
        </Link>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() =>
              setProfileOpen((value) => !value)
            }
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 transition hover:bg-slate-100"
            aria-expanded={profileOpen}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white">
              A
            </div>

            <div className="hidden text-left xl:block">
              <p className="text-sm font-semibold text-slate-900">
                Administrator
              </p>

              <p className="text-xs text-slate-500">
                Super Admin
              </p>
            </div>

            <ChevronDown
              size={18}
              className={`text-slate-500 transition-transform ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-4">
                <p className="font-semibold text-slate-900">
                  Administrator
                </p>

                <p className="text-xs text-slate-500">
                  Super Admin
                </p>
              </div>

              <div className="p-2">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <User size={17} />
                  Account Settings
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut size={17} />
                  {loggingOut
                    ? 'Logging out...'
                    : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}