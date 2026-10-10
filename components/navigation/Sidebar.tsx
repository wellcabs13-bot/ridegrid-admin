"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, X, Search } from "lucide-react";
import { navigation } from "./navigation-data";
import { useAuth } from "@/contexts/AuthContext";

// Dark navigation rail. `unread` is the signed-in user's real unread notification count.
export default function Sidebar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const visible = (href?: string) =>
    (href !== "/website-seo" || user?.role === "SUPER_ADMIN") && (href !== "/live-operations" || user?.role === "SUPER_ADMIN" || user?.role === "OPERATIONS");
  const groups = navigation
    .map(group => ({ ...group, items: group.items.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) && visible(item.href)) }))
    .filter(group => group.items.length);
  return <>
    <button aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)} className="rg-icon fixed left-3 top-3.5 z-50 bg-white md:!hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
    {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
    <aside id="admin-navigation" className={`rg-rail fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col text-white transition-transform md:static md:w-[216px] md:translate-x-0 xl:w-[232px] ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <Link href="/admin" className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <span className="relative flex h-8 w-8 items-center justify-center"><MapPin size={32} className="fill-red-600 text-red-600" /><span className="absolute top-[7px] h-2.5 w-2.5 rounded-full bg-white" /></span>
        <span className="text-xl font-extrabold leading-none tracking-tight">Ride<span className="text-red-500">Grid</span><span className="mt-1 block text-[10px] font-medium tracking-normal text-neutral-400">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Operations platform"}</span></span>
      </Link>
      <label className="mx-4 mb-3 mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 focus-within:border-red-500/60">
        <Search size={14} className="text-neutral-400" />
        <input aria-label="Find a module" placeholder="Search menu…" value={query} onChange={e => setQuery(e.target.value)} className="!min-h-0 !border-0 !bg-transparent !p-0 !text-[13px] !text-white placeholder:!text-neutral-500 min-w-0 w-full outline-none" />
      </label>
      <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map(group => <section key={group.title}>
          {group.items.length > 1 || group.title !== group.items[0]?.title ? <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{group.title}</p> : null}
          {group.items.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            const count = item.href === "/notifications" ? unread : 0;
            return <Link key={item.title} href={item.href!} aria-current={active ? "page" : undefined}
              className={`my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${active ? "bg-gradient-to-b from-red-500 to-red-600 font-semibold text-white shadow-[0_8px_18px_-8px_rgba(225,29,46,0.7)]" : "font-medium text-neutral-300 hover:bg-white/8 hover:text-white"}`}>
              <Icon size={17} className={active ? "text-white" : "text-neutral-400"} />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {count > 0 && <span aria-label={`${count} unread`} className="min-w-[20px] rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-1 ring-white/20">{count > 99 ? "99+" : count}</span>}
            </Link>;
          })}
        </section>)}
        {!groups.length && <p className="px-3 text-sm text-neutral-400">No matching modules.</p>}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{(user?.name || user?.email || "R").slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{user?.name || user?.email}</p><p className="truncate text-[11px] text-neutral-400">{user?.role.replaceAll("_", " ")}</p></div>
      </div>
    </aside>
  </>;
}
