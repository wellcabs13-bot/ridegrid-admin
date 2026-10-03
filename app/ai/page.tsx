"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData } from "@/components/admin/Primitives";
import { Notice, Pill, Section } from "@/components/admin/kit";

type View = {
  textAi: { configured: boolean; provider: string | null; model: string | null };
  imageAi: { configured: boolean };
  capabilities: { name: string; kind: "AI" | "RULES"; status: string; note: string }[];
};

export default function AIPage() {
  const { data, loading, error, reload } = useAdminData<View>("/api/admin/platform?view=ai");
  return <DashboardLayout><div className="mx-auto max-w-[1200px] space-y-5">
    <PageHeading title="AI services" description="Which features are AI-backed and whether an AI provider is configured. Rule-based features are labelled as rules, not AI." />
    <DataState loading={loading && !data} error={error} onRetry={reload}>{data && <>
      {!data.textAi.configured && !data.imageAi.configured && <Notice>AI services not configured. No AI provider credentials are set, so no AI features are running.</Notice>}
      <Section title="Providers"><ul className="divide-y divide-slate-200 text-sm">
        <li className="flex items-center justify-between px-5 py-3"><span>Text AI {data.textAi.configured ? `· ${data.textAi.provider}${data.textAi.model ? ` · ${data.textAi.model}` : ""}` : ""}</span><Pill value={data.textAi.configured ? "ACTIVE" : "NOT_CONFIGURED"} label={data.textAi.configured ? "Configured" : "Not configured"} /></li>
        <li className="flex items-center justify-between px-5 py-3"><span>Image generation</span><Pill value={data.imageAi.configured ? "ACTIVE" : "NOT_CONFIGURED"} label={data.imageAi.configured ? "Configured" : "Not configured"} /></li>
      </ul></Section>
      <Section title="Capabilities"><table className="rg-table"><thead><tr><th>Capability</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead><tbody>{data.capabilities.map(c => <tr key={c.name}><td>{c.name}</td><td>{c.kind === "AI" ? "AI" : "Rules (deterministic)"}</td><td><Pill value={c.status} label={c.status === "ACTIVE" ? "Active" : "Not configured"} /></td><td className="text-xs text-neutral-500">{c.note}</td></tr>)}</tbody></table></Section>
    </>}</DataState>
  </div></DashboardLayout>;
}
