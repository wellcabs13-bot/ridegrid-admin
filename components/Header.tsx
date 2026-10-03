"use client";
import { Bell, Settings, Plus, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try { await logout(); router.replace("/login"); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign out."); }
    finally { setBusy(false); }
  }
  const page = pathname === "/admin" ? "Command center" : pathname.split("/").filter(Boolean).map(p => p.replaceAll("-", " ")).join(" / ");
  return <header className="relative z-20 flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 pl-16 md:px-6 md:pl-6">
    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">RideGrid / Workspace</p><p className="mt-1 truncate text-lg font-semibold capitalize text-neutral-950">{page}</p></div>
    <div className="flex shrink-0 items-center gap-2">
      <Link href="/marketplace" className="rg-primary hidden sm:inline-flex"><Plus size={16}/> New booking</Link>
      <Link href="/notifications" aria-label="Notifications" className="rg-icon"><Bell size={19}/></Link>
      <Link href="/settings" aria-label="Account settings" className="rg-icon"><Settings size={19}/></Link>
      <div className="hidden border-l border-neutral-200 pl-3 lg:block"><p className="max-w-40 truncate text-sm font-semibold">{user?.name || user?.email}</p><p className="text-xs text-neutral-500">{user?.role.replaceAll("_", " ")}</p></div>
      <button type="button" className="rg-icon" onClick={signOut} disabled={busy} aria-label={busy ? "Signing out" : "Sign out"}><LogOut size={18}/></button>
    </div>
    {error && <p role="alert" className="absolute right-4 top-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </header>;
}
