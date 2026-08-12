"use client";

import Link from "next/link";
import {
  HelpCircle,
  LogOut,
  Settings2,
} from "lucide-react";
import { useState } from "react";

export default function SidebarFooter() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      // Continue to login even if the logout request fails.
    } finally {
      window.location.href = "/login";
    }
  };

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
        href="/support"
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <HelpCircle size={18} />
        <span>Help Center</span>
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={18} />
        <span>{loggingOut ? "Logging out..." : "Logout"}</span>
      </button>
    </div>
  );
}