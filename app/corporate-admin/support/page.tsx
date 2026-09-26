"use client";
import { Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import { API, DataState, PageHeader, Panel, useAdminData } from "@/components/corporate-admin/ui";

type Support = { name: string; phone: string; phoneHref: string; email: string; emailHref: string; whatsapp: string | null; accountManager: { name: string; email: string | null; mobile: string | null } | null };

export default function SupportPage() {
  const { data, loading, error, reload } = useAdminData<Support>(`${API}/support`);
  const card = (href: string, Icon: typeof Phone, title: string, value: string, external = false) =>
    <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className="rg-card flex items-center gap-4 p-5 hover:border-red-200"><span className="rounded-xl bg-red-50 p-3 text-red-700"><Icon size={20}/></span><span><span className="block text-sm text-neutral-500">{title}</span><span className="block font-semibold">{value}</span></span></a>;
  return <>
    <PageHeader title="Support" description="Help with bookings, trips, billing or your account."/>
    <DataState loading={loading} error={error} onRetry={reload}>{data && <>
      <div className="grid gap-4 md:grid-cols-3">
        {card(data.phoneHref, Phone, `Call ${data.name}`, data.phone)}
        {card(data.emailHref, Mail, "Email", data.email)}
        {data.whatsapp && card(data.whatsapp, MessageCircle, "WhatsApp", "Chat with support", true)}
      </div>
      <Panel title="Your account manager">
        {data.accountManager ? <div className="flex flex-wrap items-center gap-4 p-5"><span className="rounded-xl bg-neutral-100 p-3"><UserRound size={20}/></span><div className="text-sm"><p className="font-semibold">{data.accountManager.name}</p><p className="text-neutral-500">{[data.accountManager.email, data.accountManager.mobile].filter(Boolean).join(" · ") || "Contact details not recorded"}</p></div></div>
          : <p className="p-5 text-sm text-neutral-500">No dedicated account manager is assigned. Use the support contacts above.</p>}
      </Panel>
    </>}</DataState>
  </>;
}
