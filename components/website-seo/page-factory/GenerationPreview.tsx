"use client";

import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import type { KeywordResult, ContentResult, SeoResult } from "@/lib/website-seo/page-factory/types";
import { ResultDetails } from "./shared";

export type GenerationPreviewValue = { kind: "keywords"; result: KeywordResult } | { kind: "content"; result: ContentResult } | { kind: "seo"; result: SeoResult };

export default function GenerationPreview({ value }: { value: GenerationPreviewValue }) {
  if (value.kind === "keywords") {
    const result = value.result;
    return <WebsiteSeoCard><h3 className="text-lg font-black">Keyword {result.persistence ? "persistence result" : "preview"}</h3>
      <p className="mt-2 text-sm text-zinc-500">{result.candidateCount} candidates · {result.clusterCount} clusters · {result.mapping.mappedKeywordCount} mapped</p>
      {result.persistence && <p className="mt-2 text-sm">{result.persistence.created} created · {result.persistence.preserved} preserved · {result.persistence.unresolvedRelationships} unresolved relationships</p>}
      <div className="my-4 max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead className="bg-zinc-100"><tr><th className="p-2">Keyword</th><th className="p-2">Type</th><th className="p-2">Intent</th></tr></thead><tbody>{result.keywords.map((keyword) => <tr key={keyword.normalizedKeyword} className="border-b border-zinc-100"><td className="p-2">{keyword.keyword}</td><td className="p-2">{keyword.type}</td><td className="p-2">{keyword.intent}</td></tr>)}</tbody></table></div>
      <ResultDetails title="Full keyword result" data={result} /></WebsiteSeoCard>;
  }
  const result = value.result;
  return <WebsiteSeoCard><h3 className="text-lg font-black">{value.kind === "content" ? "Content" : "SEO"} result</h3>
    <p className="mt-2 text-sm font-bold">{result.persistence.status} · Quality {result.quality.status} · Score {result.quality.score}</p>
    {result.persistence.status === "SKIPPED" && <p className="mt-2 text-sm text-amber-800">{result.persistence.reason}</p>}
    <div className="my-4 space-y-3 text-sm">{result.quality.issues.map((issue, index) => <p key={`issue-${index}`} className="text-red-700">{issue.message}</p>)}{result.quality.warnings.map((issue, index) => <p key={`warning-${index}`} className="text-amber-700">{issue.message}</p>)}</div>
    {value.kind === "content" ? <div className="mb-4 space-y-4"><h4 className="font-black">{value.result.pageTitle}</h4>{value.result.sections.map((section) => <details key={section.id} className="rounded-xl border border-zinc-200 p-3"><summary className="cursor-pointer text-sm font-bold">{section.heading || section.type}</summary><div className="mt-3 space-y-2 text-sm leading-6">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.benefits.length > 0 && <ul className="list-disc pl-5">{section.benefits.map((benefit, index) => <li key={index}>{benefit}</li>)}</ul>}{section.faqs.map((faq, index) => <div key={index}><p className="font-bold">{faq.question}</p><p>{faq.answer}</p></div>)}{section.binding && <p className="text-xs text-zinc-500">{section.binding.resource}: requires live data resolution.</p>}</div></details>)}</div> :
      <dl className="mb-4 space-y-3 text-sm"><div><dt className="font-bold">Title</dt><dd>{value.result.metadata.title}</dd></div><div><dt className="font-bold">Description</dt><dd>{value.result.metadata.description}</dd></div><div><dt className="font-bold">Canonical</dt><dd className="break-all">{value.result.canonical.url || value.result.canonical.path || "Unavailable"}</dd></div><div><dt className="font-bold">Indexability</dt><dd>{value.result.indexability.indexable ? "Indexable" : "Noindex"} · {value.result.indexability.reasonCodes.join(", ")}</dd></div><div><dt className="font-bold">Sitemap eligibility</dt><dd>{value.result.sitemapEligibility.eligible ? "Eligible" : "Ineligible"}</dd></div></dl>}
    <ResultDetails title="Full engine result" data={result} />
  </WebsiteSeoCard>;
}
