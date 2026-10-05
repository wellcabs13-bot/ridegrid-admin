"use client";
import { Bell, Plus, LogOut, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Top bar: booking search (the central booking list searches booking number, route and
// vehicle registration), notifications with the real unread count, and the account chip.
export default function Header({ unread = 0 }: { unread?: number }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try { await logout(); router.replace("/login"); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign out."); }
    finally { setBusy(false); }
  }
  function search(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/bookings?q=${encodeURIComponent(term)}`);
  }
  return <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white pl-14 pr-4 md:px-6">
    <form onSubmit={search} role="search" className="flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 focus-within:border-red-500">
      <Search size={15} className="shrink-0 text-neutral-400" />
      <input aria-label="Search bookings" value={q} onChange={e => setQ(e.target.value)} placeholder="Search bookings by ID, route or vehicle number…" className="!min-h-0 !border-0 !bg-transparent !p-0 !py-2.5 min-w-0 w-full !text-[13px] outline-none" />
    </form>
    <div className="flex shrink-0 items-center gap-2">
      <Link href="/marketplace/booking" className="rg-primary hidden sm:inline-flex"><Plus size={15} /> New booking</Link>
      <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="rg-icon relative">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
      </Link>
      <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-sm font-bold text-white">{(user?.name || user?.email || "R").slice(0, 1).toUpperCase()}</span>
        <div className="hidden lg:block"><p className="max-w-40 truncate text-[13px] font-semibold leading-4">{user?.name || user?.email}</p><p className="text-[11px] text-neutral-500">{user?.role === "SUPER_ADMIN" ? "Platform Owner" : user?.role.replaceAll("_", " ")}</p></div>
      </div>
      <button type="button" className="rg-icon" onClick={signOut} disabled={busy} aria-label={busy ? "Signing out" : "Sign out"}><LogOut size={17} /></button>
    </div>
    {error && <p role="alert" className="absolute right-4 top-full mt-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </header>;
}
