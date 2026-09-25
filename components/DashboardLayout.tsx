"use client";
import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation";
import Header from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import "./admin.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
    // Company administrators work in their own company-scoped portal.
    else if (!loading && user?.role === "CORPORATE_ADMIN") router.replace("/corporate-admin");
  }, [loading, isAuthenticated, user?.role, router, pathname]);
  if (loading || !isAuthenticated || user?.role === "CORPORATE_ADMIN") return <div className="flex min-h-screen items-center justify-center bg-neutral-50" role="status"><span className="animate-pulse text-sm font-medium text-neutral-600">Restoring your RideGrid session…</span></div>;
  return <div className="rg-admin flex h-dvh overflow-hidden bg-neutral-50">
    <a className="rg-skip" href="#admin-content">Skip to content</a>
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Header />
      <main id="admin-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto p-4 md:p-6 xl:p-8">{children}</main>
    </div>
  </div>;
}
