import Link from "next/link";

// Advanced tools: engines that run automatically. Kept reachable, out of the main menu.
const TOOLS: [string, string, string][] = [
  ["Publishing & sitemap sync", "/website-seo/website/publishing", "Publish/unpublish generated pages and re-sync sitemap discovery."],
  ["Page factory", "/website-seo/page-factory", "Create route, city, area, airport, service and vehicle page drafts in bulk."],
  ["Page templates & content blocks", "/website-seo/website/templates", "Reusable layouts used by generated pages."],
  ["Content", "/website-seo/content", "Content briefs and refresh workflows."],
  ["AI image generation", "/website-seo/website/media/ai-images", "Generate page images (requires an image AI provider)."],
  ["Search intelligence", "/website-seo/search-intelligence", "Keyword clusters, opportunities, competitors (only real observations are shown)."],
  ["Performance", "/website-seo/performance", "Traffic and conversion views (requires analytics data sources)."],
  ["Automation", "/website-seo/automation", "Scheduled generation and publishing workflows."],
  ["AI control", "/website-seo/ai-control", "Rules and guardrails for AI-generated content."],
];

export default function AdvancedToolsPage() {
  return <div className="mx-auto max-w-5xl space-y-5 px-6 py-8 lg:px-8">
    <div><h1 className="text-2xl font-black text-zinc-900">Advanced tools</h1><p className="mt-1 text-sm text-zinc-600">These engines run automatically. Use them only when a manual action is needed.</p></div>
    <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">{TOOLS.map(([label, href, hint]) => <li key={href}><Link href={href} className="block px-5 py-3 hover:bg-zinc-50"><p className="text-sm font-bold text-zinc-900">{label}</p><p className="text-xs text-zinc-500">{hint}</p></Link></li>)}</ul>
  </div>;
}
