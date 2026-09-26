"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, BarChart3, Briefcase, Building2, CalendarCheck, CarFront, ClipboardCheck, CreditCard, FileSignature, FileText, GitBranch,
  LayoutDashboard, LifeBuoy, LogOut, Menu, Network, ShieldCheck, UserCog, Users, Wallet, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiData, API } from "./ui";
import "../admin.css";

const NAV: { title: string; items: { title: string; href: string; icon: typeof Bell }[] }[] = [
  { title: "Overview", items: [{ title: "Dashboard", href: "/corporate-admin", icon: LayoutDashboard }] },
  { title: "Travel", items: [
    { title: "Approvals", href: "/corporate-admin/approvals", icon: ClipboardCheck },
    { title: "Bookings", href: "/corporate-admin/bookings", icon: CalendarCheck },
  ] },
  { title: "Organisation", items: [
    { title: "Employees", href: "/corporate-admin/employees", icon: Users },
    { title: "Branches", href: "/corporate-admin/branches", icon: Building2 },
    { title: "Departments", href: "/corporate-admin/departments", icon: Network },
    { title: "Admins & approvers", href: "/corporate-admin/admins", icon: UserCog },
  ] },
  { title: "Controls", items: [
    { title: "Travel policy", href: "/corporate-admin/policy", icon: ShieldCheck },
    { title: "Approval workflow", href: "/corporate-admin/workflow", icon: GitBranch },
    { title: "Budgets", href: "/corporate-admin/budgets", icon: Wallet },
  ] },
  { title: "Finance", items: [
    { title: "Billing & credit", href: "/corporate-admin/billing", icon: CreditCard },
    { title: "Invoices", href: "/corporate-admin/invoices", icon: FileText },
    { title: "Reports", href: "/corporate-admin/reports", icon: BarChart3 },
  ] },
  { title: "Account", items: [
    { title: "Company profile", href: "/corporate-admin/company", icon: Briefcase },
    { title: "Commercial & documents", href: "/corporate-admin/commercial", icon: FileSignature },
    { title: "Notifications", href: "/corporate-admin/notifications", icon: Bell },
    { title: "Support", href: "/corporate-admin/support", icon: LifeBuoy },
  ] },
];

type Session = { user: { name: string }; company: { companyName: string; status: string } };

export default function CorporateAdminLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [unread, setUnread] = useState(0);
  const isAdmin = user?.role === "CORPORATE_ADMIN";

  useEffect(() => { if (!loading && !isAuthenticated) router.replace("/login"); }, [loading, isAuthenticated, router]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!isAdmin) return;
    apiData<Session>(`${API}/session`).then(setSession).catch((e) => setSessionError(e instanceof Error ? e.message : "Unable to load your company."));
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    const load = () => apiData<{ unread: number }>(`${API}/notifications?unread=1`).then((d) => { if (live) setUnread(d.unread); }).catch(() => undefined);
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => { live = false; window.clearInterval(t); };
  }, [isAdmin, pathname]);

  if (loading || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-neutral-50" role="status"><span className="animate-pulse text-sm font-medium text-neutral-600">Restoring your session…</span></div>;
  if (!isAdmin) return <div className="rg-admin flex min-h-screen items-center justify-center bg-neutral-50 p-6"><div className="rg-card max-w-md p-8 text-center"><h1 className="text-lg font-semibold">Corporate administrator access required</h1><p className="mt-2 text-sm text-neutral-500">This portal is available to company travel administrators. Your account role is {user?.role.replaceAll("_", " ").toLowerCase()}.</p><Link href="/admin" className="rg-primary mt-6">Go to your workspace</Link></div></div>;

  async function signOut() { await logout().catch(() => undefined); router.replace("/login"); router.refresh(); }
  const active = (href: string) => pathname === href || (href !== "/corporate-admin" && pathname.startsWith(href + "/"));

  return <div className="rg-admin flex h-dvh overflow-hidden bg-neutral-50">
    <a className="rg-skip" href="#corporate-content">Skip to content</a>
    <button aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="corporate-navigation" onClick={() => setOpen(!open)} className="fixed left-3 top-5 z-50 inline-flex items-center justify-center rounded-[.65rem] border border-neutral-200 bg-white p-[.65rem] lg:hidden">{open ? <X size={20}/> : <Menu size={20}/>}</button>
    {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)}/>}
    <aside id="corporate-navigation" className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-white/10 bg-neutral-950 text-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <Link href="/corporate-admin" className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-6 pl-16 lg:pl-6"><span className="rounded-xl bg-red-600 p-2"><CarFront size={22}/></span><span className="min-w-0 text-lg font-bold tracking-tight">RideGrid<span className="block truncate text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-400">Corporate travel</span></span></Link>
      <nav aria-label="Corporate navigation" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((g) => <section key={g.title}><p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{g.title}</p>{g.items.map((item) => {
          const Icon = item.icon;
          const on = active(item.href);
          return <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className={`my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${on ? "bg-red-600 font-semibold text-white" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"}`}><Icon size={17}/><span className="flex-1">{item.title}</span>{item.href.endsWith("/notifications") && unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold">{unread}</span>}</Link>;
        })}</section>)}
      </nav>
      <div className="border-t border-white/10 p-4"><p className="truncate text-sm font-medium">{user?.name}</p><p className="mt-1 truncate text-xs text-neutral-400">Corporate administrator</p></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-20 flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white py-2 pl-16 pr-4 md:pr-6 lg:pl-6">
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Company workspace</p><p className="mt-1 truncate text-lg font-semibold text-neutral-950">{session?.company.companyName ?? (sessionError ? "Company unavailable" : "Loading…")}</p></div>
        <div className="flex shrink-0 items-center gap-2">
          {session && session.company.status !== "ACTIVE" && <span className="hidden rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 sm:inline">Account {session.company.status.toLowerCase()} · read only</span>}
          <Link href="/corporate-admin/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="rg-icon relative"><Bell size={19}/>{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}</Link>
          <div className="hidden border-l border-neutral-200 pl-3 lg:block"><p className="max-w-44 truncate text-sm font-semibold">{user?.name}</p><p className="text-xs text-neutral-500">Travel administrator</p></div>
          <button type="button" className="rg-icon" onClick={signOut} aria-label="Sign out"><LogOut size={18}/></button>
        </div>
      </header>
      <main id="corporate-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto p-4 md:p-6 xl:p-8">
        {sessionError ? <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{sessionError}</div> : <div className="mx-auto max-w-[1440px] space-y-6">{children}</div>}
      </main>
    </div>
  </div>;
}
