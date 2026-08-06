import { ReactNode } from "react";

import { Sidebar } from "@/components/navigation";
import Header from "./Header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">

      {/* Sidebar */}

      <Sidebar />

      {/* Main Content */}

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}

        <Header />

        {/* Page */}

        <main className="flex-1 overflow-y-auto bg-slate-100 p-8">

          {children}

        </main>

      </div>

    </div>
  );
}