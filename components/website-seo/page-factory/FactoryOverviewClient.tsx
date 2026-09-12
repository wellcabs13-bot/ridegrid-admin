"use client";

import Link from "next/link";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import { FACTORY_TYPES } from "@/lib/website-seo/page-factory/config";
import { buttonClass, FactoryHeading, Feedback, Handoff, useFactoryInventory } from "./shared";

export default function FactoryOverviewClient() {
  const { data, loading, error, reload } = useFactoryInventory();
  const pageEntities = new Set(data?.pages.map((page) => page.entityId));
  const metrics = data ? [
    ["Total entities", data.entities.length], ["Active entities", data.entities.filter((e) => e.status === "ACTIVE").length],
    ["Generated pages", data.pages.length], ["Pages marked READY", data.pages.filter((p) => p.status === "READY").length],
    ["Published pages", data.pages.filter((p) => p.status === "PUBLISHED").length], ["Entities without pages", data.entities.filter((e) => !pageEntities.has(e.id)).length],
  ] as const : [];
  return <><FactoryHeading title="Page Factory" description="Create website entities, prepare page packages and review readiness with the existing RideGrid engines."
    action={<button className={buttonClass} disabled={loading} onClick={() => void reload().catch(() => undefined)}>Reload</button>} />
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 lg:px-8"><Feedback error={error} />
      {loading && <p role="status">Loading real entity and page inventory…</p>}
      {data && <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{metrics.map(([label, value]) => <WebsiteSeoCard key={label}><p className="text-xs font-bold uppercase text-zinc-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></WebsiteSeoCard>)}</div>
        <p className="text-xs text-zinc-500">READY is the stored page lifecycle status. Run readiness preview to evaluate publication blockers.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{FACTORY_TYPES.map((type) => <WebsiteSeoCard key={type.type}><h2 className="text-lg font-black">{type.label}</h2><p className="mt-2 text-sm text-zinc-500">{data.entities.filter((e) => e.type === type.type).length} entities · {data.pages.filter((p) => p.entity.type === type.type).length} pages</p><Link href={`/website-seo/page-factory/${type.slug}`} className={`${buttonClass} mt-4`}>Open {type.label}</Link></WebsiteSeoCard>)}</div>
        <div className="grid gap-6 lg:grid-cols-2"><WebsiteSeoCard><h2 className="font-black">Recent entities</h2>{data.entities.length ? <ul className="mt-3 divide-y divide-zinc-100">{[...data.entities].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6).map((entity) => <li key={entity.id} className="py-3"><Link className="font-bold text-red-600" href={`/website-seo/page-factory/${FACTORY_TYPES.find((t) => t.type === entity.type)?.slug}?entityId=${encodeURIComponent(entity.id)}`}>{entity.name}</Link><p className="text-xs text-zinc-500">{entity.type} · {entity.status} · {new Date(entity.createdAt).toLocaleDateString()}</p></li>)}</ul> : <p className="mt-3 text-sm text-zinc-500">No entities yet. Open a factory to create one.</p>}</WebsiteSeoCard>
        <WebsiteSeoCard><h2 className="font-black">Recently updated pages</h2>{data.pages.length ? <ul className="mt-3 divide-y divide-zinc-100">{data.pages.slice(0, 6).map((page) => <li key={page.id} className="break-words py-3"><Link className="font-bold text-red-600" href={`/website-seo/page-factory/${FACTORY_TYPES.find((t) => t.type === page.entity.type)?.slug}?entityId=${encodeURIComponent(page.entityId)}`}>{page.pathname}</Link><p className="text-xs text-zinc-500">{page.entity.name} · {page.status}</p></li>)}</ul> : <p className="mt-3 text-sm text-zinc-500">No generated pages yet.</p>}</WebsiteSeoCard></div>
      </>}
      <Link className={buttonClass} href="/website-seo/page-factory/bulk">Open Bulk Generator →</Link><Handoff />
    </div></>;
}
