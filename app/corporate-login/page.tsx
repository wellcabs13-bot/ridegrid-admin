import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import CorporateLoginForm from "@/components/corporate-admin/CorporateLoginForm";

export const metadata: Metadata = { title: "Corporate Portal sign in | RideGrid by Wellcabs", robots: { index: false, follow: false } };

// The Corporate Portal's own sign-in. Staff (Super Admin / Operations / Finance) use a separate login.
export default function CorporateLoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-8 text-center">
        <span className="mx-auto inline-flex rounded-2xl bg-red-600 p-3 text-white"><Building2 size={26} aria-hidden/></span>
        <h1 className="mt-4 text-2xl font-bold text-neutral-950">Corporate Travel Portal</h1>
        <p className="mt-2 text-sm text-neutral-500">RideGrid by Wellcabs · for company travel administrators</p>
      </div>
      <CorporateLoginForm/>
      <div className="mt-8 space-y-2 border-t border-neutral-100 pt-6 text-center text-sm text-neutral-500">
        <p>Travelling employee? Sign in to the <strong>RideGrid Corporate Employee App</strong> with your company email.</p>
        <p>New to corporate travel with Wellcabs? <Link href="/corporate-travel" className="font-semibold text-red-700">Explore corporate solutions</Link></p>
      </div>
    </div>
  </main>;
}
