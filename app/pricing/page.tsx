"use client";
import DashboardLayout from "@/components/DashboardLayout";
import SimplePricing from "@/components/pricing/SimplePricing";
import { useAuth } from "@/contexts/AuthContext";

// Platform staff get the Super Admin shell. Vendor users also reach this page, so they keep
// the plain page and never see the admin navigation. Pricing logic is unchanged.
const STAFF = ["SUPER_ADMIN", "OPERATIONS", "FINANCE"];
export default function PricingPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center" role="status"><span className="animate-pulse text-sm font-medium text-neutral-600">Restoring your RideGrid session…</span></div>;
  return user && STAFF.includes(user.role) ? <DashboardLayout><SimplePricing /></DashboardLayout> : <SimplePricing />;
}
