"use client";
import Link from "next/link";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import { buttonClass, contentClass, Feedback, ProviderNotice, SearchHeading, useSearchData } from "./shared";
interface Overview { totalKeywords: number; activeMappedKeywords: number; clusters: number; scoredOpportunities: number; activeCompetitors: number; organicObservations: number; aiObservations: number; latestObservation: string | null }
export default function OverviewClient() {
  const { data, loading, error, reload } = useSearchData<Overview>("search-intelligence/overview");
  const fields: [keyof Omit<Overview, "latestObservation">, string][] = [["totalKeywords", "W4 keywords"], ["activeMappedKeywords", "Active / mapped keywords"], ["clusters", "W4 clusters"], ["scoredOpportunities", "Keywords with W4 scores"], ["activeCompetitors", "Active competitors"], ["organicObservations", "Ranking observations"], ["aiObservations", "AI visibility observations"]];
  return <><SearchHeading title="Search Intelligence" action={<button className={buttonClass} onClick={reload} disabled={loading}>Reload</button>} /><div className={contentClass}><Feedback error={error} loading={loading} /><ProviderNotice />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{fields.map(([key, label]) => <WebsiteSeoCard key={key}><p className="text-xs font-bold uppercase text-zinc-500">{label}</p><p className="mt-3 text-3xl font-black">{data?.[key] ?? "—"}</p></WebsiteSeoCard>)}</div>
    {data && <WebsiteSeoCard><p className="text-sm">Latest observation: {data.latestObservation ? new Date(data.latestObservation).toLocaleString() : "None recorded"}</p>{!data.organicObservations && <p className="mt-2 text-sm text-zinc-500">No ranking observations recorded yet.</p>}{!data.aiObservations && <p className="mt-2 text-sm text-zinc-500">No AI visibility observations recorded yet.</p>}</WebsiteSeoCard>}
    <WebsiteSeoCard><h2 className="font-black">Discovery and indexing</h2><p className="my-3 text-sm text-zinc-500">W7 coverage and crawl state remain in Publishing Manager. UNKNOWN coverage does not indicate a ranking.</p><Link className={buttonClass} href="/website-seo/website/publishing">Open Publishing Manager</Link></WebsiteSeoCard>
  </div></>;
}
