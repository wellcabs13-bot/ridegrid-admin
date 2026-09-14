import {
  Activity,
  Bot,
  BrainCircuit,
  FileStack,
  Globe2,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react";

import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import WebsiteSeoBadge from "@/components/website-seo/ui/WebsiteSeoBadge";
import WebsiteSeoButton from "@/components/website-seo/ui/WebsiteSeoButton";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import Link from "next/link";

const systemPaths: Record<string,string> = { Website: "website", "Page Factory": "page-factory", "Search Intelligence": "search-intelligence", Content: "website/pages", "SEO & Indexing": "website/publishing", Automation: "automation", Performance: "performance", "AI Control": "ai-control" };

const systems = [
  {
    title: "Website",
    description: "Pages, templates, navigation, media and site settings.",
    icon: Globe2,
  },
  {
    title: "Page Factory",
    description: "Routes, cities, services, airports and scalable page generation.",
    icon: FileStack,
  },
  {
    title: "Search Intelligence",
    description: "Keywords, clusters, opportunities, competitors and rankings.",
    icon: Search,
  },
  {
    title: "Content",
    description: "AI content, briefs, refresh workflows and quality control.",
    icon: BrainCircuit,
  },
  {
    title: "SEO & Indexing",
    description: "Metadata, schema, links, sitemap, discovery and coverage.",
    icon: Sparkles,
  },
  {
    title: "Automation",
    description: "Generation, publishing, monitoring and optimization workflows.",
    icon: Workflow,
  },
  {
    title: "Performance",
    description: "Traffic, pages, conversions, bookings and revenue intelligence.",
    icon: Activity,
  },
  {
    title: "AI Control",
    description: "Strategy, recommendations, rules and quality guardrails.",
    icon: Bot,
  },
];

export default function WebsiteSeoPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-10 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Command Center"
            title="Website & SEO Growth OS"
            description="Central control for RideGrid website management, programmatic SEO, search intelligence, AI content, publishing, indexing and performance."
            action={
              <Link href="/website-seo/page-factory" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white">
                <Sparkles size={17} />
                Create / Generate
              </Link>
            }
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {systems.map((system) => {
              const Icon = system.icon;

              return (
                <Link href={`/website-seo/${systemPaths[system.title]}`}
                  key={system.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-red-500/50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                    <Icon size={21} />
                  </div>

                  <h2 className="mt-5 font-bold text-white">
                    {system.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {system.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          <WebsiteSeoCard className="lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Platform Foundation
                </div>

                <h2 className="mt-2 text-xl font-black text-zinc-950">
                  Shared Website & SEO architecture
                </h2>
              </div>

              <WebsiteSeoBadge tone="success">
                ACTIVE
              </WebsiteSeoBadge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Shared dashboard shell",
                "Shared design system",
                "Central AI boundary",
                "Reusable status model",
                "Unified module navigation",
                "Existing RideGrid core integration",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </WebsiteSeoCard>

          <div className="rounded-2xl bg-zinc-950 p-6 text-white">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
              Architecture
            </div>

            <h2 className="mt-3 text-xl font-black">
              One engine. Massive scale.
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Shared engines will power routes, cities, airports, services,
              content, SEO and automation without duplicate architectures.
            </p>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm font-bold">
              Entity → Intelligence → Page → SEO → Publish → Measure
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
