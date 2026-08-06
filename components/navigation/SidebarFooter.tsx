'use client';

import Link from "next/link";
import {
  HelpCircle,
  LogOut,
  Settings2,
} from "lucide-react";

export default function SidebarFooter() {
  return (
    <div className="space-y-2">

      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <Settings2 size={18} />
        <span>Settings</span>
      </Link>

      <Link
        href="/help"
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <HelpCircle size={18} />
        <span>Help Center</span>
      </Link>

      <button
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 hover:bg-red-500/10"
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>

    </div>
  );
}