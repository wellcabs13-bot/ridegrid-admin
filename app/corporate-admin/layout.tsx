import type { Metadata } from "next";
import { ReactNode } from "react";
import CorporateAdminLayout from "@/components/corporate-admin/CorporateAdminLayout";

export const metadata: Metadata = { title: "Corporate Travel Admin | RideGrid", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return <CorporateAdminLayout>{children}</CorporateAdminLayout>;
}
