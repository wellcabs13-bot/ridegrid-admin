"use client";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeading } from "@/components/admin/Primitives";
export default function SettingsPage() {
  const {user}=useAuth();
  return <DashboardLayout><div className="space-y-6"><PageHeading title="Settings" description="Your account and the configuration tools available in this workspace."/>
    <section className="rg-card p-6"><h2 className="font-semibold">Your account</h2><dl className="mt-5 grid gap-5 text-sm sm:grid-cols-3">{[["Name",user?.name||"—"],["Email",user?.email||"—"],["Role",user?.role.replaceAll("_"," ")||"—"]].map(([key,value])=><div key={key}><dt className="text-neutral-500">{key}</dt><dd className="mt-2 break-words font-medium">{value}</dd></div>)}</dl></section>
    <div className="grid gap-4 md:grid-cols-2">{[{title:"Pricing configuration",description:"Manage existing fare packages and vehicle pricing.",href:"/pricing"},{title:"Security and access",description:"Review configured permissions and recorded audit activity.",href:"/security"},{title:"Notifications",description:"Review your account’s notification delivery records.",href:"/notifications"},{title:"Automation",description:"Inspect the existing operational rules and Smart Return workflow.",href:"/automation"}].map(item=><Link key={item.href} href={item.href} className="rg-card block p-6 hover:border-red-300"><h2 className="font-semibold">{item.title} ↗</h2><p className="mt-2 text-sm leading-6 text-neutral-500">{item.description}</p></Link>)}</div>
    <section className="rounded-xl border border-neutral-200 p-5"><h2 className="text-sm font-semibold">Additional configuration</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Company branding, provider credentials, backup controls and general preferences do not have persistence endpoints in the current settings module. These controls are unavailable here.</p></section>
  </div></DashboardLayout>;
}
