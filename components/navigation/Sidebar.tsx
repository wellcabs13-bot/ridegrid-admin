"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront, Menu, X, Search } from "lucide-react";
import { navigation } from "./navigation-data";
import { useAuth } from "@/contexts/AuthContext";

export default function Sidebar() {
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
  const groups = navigation.map(group => ({ ...group, items: group.items.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) && (item.href !== "/website-seo" || user?.role === "SUPER_ADMIN")) })).filter(group => group.items.length);
  return <>
    <button aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)} className="rg-icon fixed left-3 top-5 z-50 bg-white md:hidden">{open ? <X size={20}/> : <Menu size={20}/>}</button>
    {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)}/>}
    <aside id="admin-navigation" className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-white/10 bg-neutral-950 text-white transition-transform md:static md:w-56 md:translate-x-0 xl:w-64 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <Link href="/admin" className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-6 pl-16 md:pl-6"><span className="rounded-xl bg-red-600 p-2"><CarFront size={23}/></span><span className="text-lg font-bold tracking-tight">RideGrid<span className="block text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-400">Operations platform</span></span></Link>
      <label className="mx-4 my-4 flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"><Search size={15} className="text-neutral-400"/><input aria-label="Find a module" placeholder="Find a module…" value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"/></label>
      <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-5">
        {groups.map(group => <section key={group.title}><p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{group.title}</p>{group.items.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
          return <Link key={item.title} href={item.href!} aria-current={active ? "page" : undefined} className={`my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-red-600 font-semibold text-white" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"}`}><Icon size={18}/>{item.title}</Link>;
        })}</section>)}
        {!groups.length && <p className="px-3 text-sm text-neutral-400">No matching modules.</p>}
      </nav>
      <div className="border-t border-white/10 p-4"><p className="truncate text-sm font-medium">{user?.name || user?.email}</p><p className="mt-1 truncate text-xs text-neutral-400">{user?.role.replaceAll("_", " ")}</p></div>
    </aside>
  </>;
}
