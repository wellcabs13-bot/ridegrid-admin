'use client';

import {
  Bell,
  Search,
  Settings,
  Plus,
  ChevronDown,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const pageName =
    pathname === "/"
      ? "Dashboard"
      : pathname
          .split("/")
          .filter(Boolean)
          .map(
            (item) =>
              item.charAt(0).toUpperCase() + item.slice(1)
          )
          .join(" / ");

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">

      {/* Left */}

      <div>

        <p className="text-sm text-slate-500">
          Welcome back 👋
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {pageName}
        </h1>

      </div>

      {/* Right */}

      <div className="flex items-center gap-4">

        {/* Search */}

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

        {/* New Booking */}

        <Link
          href="/bookings/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >

          <Plus size={18} />

          New Booking

        </Link>

        {/* Settings */}

        <button className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100">

          <Settings size={20} />

        </button>

        {/* Notifications */}

        <button className="relative rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100">

          <Bell size={20} />

          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500"></span>

        </button>

        {/* Profile */}

        <button className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 transition hover:bg-slate-100">

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
            className="text-slate-500"
          />

        </button>

      </div>

    </header>
  );
}