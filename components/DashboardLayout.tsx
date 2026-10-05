"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation";
import Header from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import "./superadmin.css";

// Super Admin shell: dark navigation rail + light workspace (see components/superadmin.css).
// The Corporate Admin portal has its own layout and theme.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
    // Company administrators work in their own company-scoped portal.
    else if (!loading && user?.role === "CORPORATE_ADMIN") router.replace("/corporate-admin");
  }, [loading, isAuthenticated, user?.role, router, pathname]);
  // The signed-in user's own unread notifications; shared by the rail and the top bar.
  useEffect(() => {
    if (loading || !isAuthenticated || user?.role === "CORPORATE_ADMIN") return;
    const controller = new AbortController();
    fetch("/api/notifications?unread=true", { cache: "no-store", signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(r => { if (r && r.success !== false && typeof r.count === "number") setUnread(r.count); })
      .catch(() => {});
    return () => controller.abort();
  }, [loading, isAuthenticated, user?.role, pathname]);
  if (loading || !isAuthenticated || user?.role === "CORPORATE_ADMIN") return <div className="rg-sa flex min-h-screen items-center justify-center" role="status"><span className="animate-pulse text-sm font-medium text-neutral-600">Restoring your RideGrid session…</span></div>;
  return <div className="rg-sa flex h-dvh overflow-hidden">
    <a className="rg-skip" href="#admin-content">Skip to content</a>
    <Sidebar unread={unread} />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Header unread={unread} />
      <main id="admin-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  </div>;
}
