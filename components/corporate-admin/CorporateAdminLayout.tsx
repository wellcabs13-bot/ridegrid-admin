"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, BarChart3, Briefcase, Building2, CalendarCheck, CarFront, ClipboardCheck, CreditCard, FileSignature, FileText, GitBranch,
  LayoutDashboard, LifeBuoy, LogOut, Menu, Network, PlusCircle, ShieldCheck, UserCog, Users, Wallet, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiData, API } from "./ui";
import "./corporate.css";

const NAV: { title: string; items: { title: string; href: string; icon: typeof Bell }[] }[] = [
  { title: "Main", items: [
    { title: "Dashboard", href: "/corporate-admin", icon: LayoutDashboard },
    { title: "New booking", href: "/corporate-admin/bookings/new", icon: PlusCircle },
    { title: "Bookings", href: "/corporate-admin/bookings", icon: CalendarCheck },
    { title: "Travel requests", href: "/corporate-admin/approvals", icon: ClipboardCheck },
  ] },
  { title: "People & organisation", items: [
    { title: "Employees", href: "/corporate-admin/employees", icon: Users },
    { title: "Departments", href: "/corporate-admin/departments", icon: Network },
    { title: "Branches", href: "/corporate-admin/branches", icon: Building2 },
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
    { title: "Reports & insights", href: "/corporate-admin/reports", icon: BarChart3 },
  ] },
  { title: "Account", items: [
    { title: "Company profile", href: "/corporate-admin/company", icon: Briefcase },
    { title: "Commercial & documents", href: "/corporate-admin/commercial", icon: FileSignature },
    { title: "Notifications", href: "/corporate-admin/notifications", icon: Bell },
    { title: "Support", href: "/corporate-admin/support", icon: LifeBuoy },
  ] },
];

type Session = { user: { name: string }; company: { companyName: string; status: string } };

function Brand() {
  return <span className="min-w-0 leading-none"><span className="block text-[22px] font-extrabold tracking-tight text-neutral-950">Ride<span className="text-red-600">Grid</span></span><span className="mt-1 block text-[10px] font-semibold text-neutral-500">by Wellcabs · Corporate Travel</span></span>;
}

export default function CorporateAdminLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [unread, setUnread] = useState(0);
  const isAdmin = user?.role === "CORPORATE_ADMIN";

  useEffect(() => { if (!loading && !isAuthenticated) router.replace("/corporate-login"); }, [loading, isAuthenticated, router]);
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

  if (loading || !isAuthenticated) return <div className="rg-corp flex min-h-screen items-center justify-center" role="status"><span className="animate-pulse text-sm font-medium text-neutral-600">Restoring your session…</span></div>;
  async function signOut() { await logout().catch(() => undefined); router.replace("/corporate-login"); router.refresh(); }
  // Other roles get no link into another workspace from here; they can only sign out.
  if (!isAdmin) return <div className="rg-corp flex min-h-screen items-center justify-center p-6"><div className="rg-card max-w-md p-8 text-center"><h1 className="text-lg font-bold">Corporate administrator access required</h1><p className="mt-2 text-sm text-neutral-500">This portal is available to company travel administrators only. Employees use the RideGrid Corporate Employee App.</p><button type="button" onClick={signOut} className="rg-primary mt-6">Sign out</button></div></div>;
  // Most specific match wins, so "New booking" is not also highlighted as "Bookings".
  const hrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
  const best = hrefs.filter((h) => pathname === h || (h !== "/corporate-admin" && pathname.startsWith(h + "/"))).sort((x, y) => y.length - x.length)[0];
  const active = (href: string) => href === best;
  const initial = (user?.name ?? "A").trim().charAt(0).toUpperCase();

  return <div className="rg-corp flex h-dvh overflow-hidden">
    <a className="rg-skip" href="#corporate-content">Skip to content</a>
    <button aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="corporate-navigation" onClick={() => setOpen(!open)} className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-neutral-200 bg-white lg:hidden">{open ? <X size={20}/> : <Menu size={20}/>}</button>
    {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}/>}
    <aside id="corporate-navigation" className={`rgc-side fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <Link href="/corporate-admin" className="flex h-[68px] shrink-0 items-center gap-2.5 px-5 pl-16 lg:pl-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white"><CarFront size={19}/></span><Brand/></Link>
      <nav aria-label="Corporate navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-2">
        {NAV.map((g) => <section key={g.title}><p className="rgc-nav-label">{g.title}</p>{g.items.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className="rgc-nav"><Icon size={17}/><span className="flex-1">{item.title}</span>{item.href.endsWith("/notifications") && unread > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread}</span>}</Link>;
        })}</section>)}
      </nav>
      <div className="m-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
        <p className="text-[12.5px] font-bold text-neutral-900">Need help with a trip?</p>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">RideGrid support is one message away.</p>
        <Link href="/corporate-admin/support" className="rg-secondary rg-sm mt-2.5 w-full"><LifeBuoy size={14}/>Contact support</Link>
      </div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-20 flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white pl-16 pr-4 md:pr-6 lg:pl-6">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-neutral-400">Company workspace</p>
          <p className="truncate text-[15px] font-bold text-neutral-950">{session?.company.companyName ?? (sessionError ? "Company unavailable" : "Loading…")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {session && session.company.status !== "ACTIVE" && <span className="hidden rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 sm:inline">Account {session.company.status.toLowerCase()} · read only</span>}
          <Link href="/corporate-admin/bookings/new" className="rg-primary hidden sm:inline-flex"><PlusCircle size={16}/>New booking</Link>
          <Link href="/corporate-admin/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="rg-icon relative"><Bell size={18}/>{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}</Link>
          <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-3">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-[13px] font-bold text-white">{initial}</span>
            <div className="hidden lg:block"><p className="max-w-40 truncate text-[13px] font-bold leading-tight">{user?.name}</p><p className="text-[11.5px] leading-tight text-neutral-500">Travel administrator</p></div>
          </div>
          <button type="button" className="rg-icon" onClick={signOut} aria-label="Sign out"><LogOut size={17}/></button>
        </div>
      </header>
      <main id="corporate-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
        {sessionError ? <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{sessionError}</div> : <div className="mx-auto max-w-[1480px] space-y-5">{children}</div>}
      </main>
    </div>
  </div>;
}
