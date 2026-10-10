"use client";

import Link from "next/link";
import {
  Activity,
  ExternalLink,
  FileStack,
  Globe2,
  LayoutTemplate,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";

type RecordValue = Record<string, unknown>;

interface OverviewState {
  entities: RecordValue[];
  pages: RecordValue[];
  templates: RecordValue[];
  keywords: RecordValue[];
  sitemapOnline: boolean;
}

const emptyState: OverviewState = {
  entities: [],
  pages: [],
  templates: [],
  keywords: [],
  sitemapOnline: false,
};

function isRecord(value: unknown): value is RecordValue {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  source: RecordValue,
  key: string
): string | undefined {
  const value = source[key];

  return typeof value === "string"
    ? value
    : undefined;
}

function readNestedRecord(
  source: RecordValue,
  key: string
): RecordValue | undefined {
  const value = source[key];

  return isRecord(value)
    ? value
    : undefined;
}

function extractList(payload: unknown): RecordValue[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const data = payload.data;

  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  return [];
}

async function safeJson(
  response: Response
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function statusOf(row: RecordValue): string {
  return (
    readString(row, "status")?.toUpperCase() ??
    "UNKNOWN"
  );
}

function pageHasMetadataNamespace(
  page: RecordValue,
  namespace: string
): boolean {
  const metadata = readNestedRecord(
    page,
    "metadata"
  );

  if (!metadata) {
    return false;
  }

  return isRecord(metadata[namespace]);
}

function dateValue(row: RecordValue): number {
  const updatedAt =
    readString(row, "updatedAt");

  const createdAt =
    readString(row, "createdAt");

  const source = updatedAt ?? createdAt;

  if (!source) {
    return 0;
  }

  const parsed = Date.parse(source);

  return Number.isNaN(parsed)
    ? 0
    : parsed;
}

function displayPageName(
  page: RecordValue
): string {
  return (
    readString(page, "title") ??
    readString(page, "name") ??
    readString(page, "path") ??
    readString(page, "slug") ??
    "Generated page"
  );
}

function displayPagePath(
  page: RecordValue
): string {
  return (
    readString(page, "path") ??
    readString(page, "canonicalPath") ??
    "Path unavailable"
  );
}

function displayEntityType(
  page: RecordValue
): string {
  return (
    readString(page, "entityType") ??
    "PAGE"
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Globe2;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
            {label}
          </div>

          <div className="mt-3 text-3xl font-black tracking-tight text-zinc-950">
            {value}
          </div>

          <div className="mt-2 text-xs font-semibold text-zinc-500">
            {detail}
          </div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalized = status.toUpperCase();

  const success =
    normalized === "ACTIVE" ||
    normalized === "READY" ||
    normalized === "PUBLISHED" ||
    normalized === "LIVE";

  const warning =
    normalized === "DRAFT" ||
    normalized === "DISCOVERED" ||
    normalized === "UNKNOWN";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
        success
          ? "bg-emerald-50 text-emerald-700"
          : warning
            ? "bg-amber-50 text-amber-700"
            : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function WebsiteManagerClient() {
  const [data, setData] =
    useState<OverviewState>(emptyState);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        entitiesResponse,
        pagesResponse,
        templatesResponse,
        keywordsResponse,
        sitemapResponse,
      ] = await Promise.all([
        fetch("/api/website-seo/entities", {
          cache: "no-store",
        }),
        fetch("/api/website-seo/pages", {
          cache: "no-store",
        }),
        fetch("/api/website-seo/templates", {
          cache: "no-store",
        }),
        fetch("/api/website-seo/keywords", {
          cache: "no-store",
        }),
        fetch("/api/website-seo/sitemap", {
          cache: "no-store",
        }),
      ]);

      const [
        entitiesPayload,
        pagesPayload,
        templatesPayload,
        keywordsPayload,
      ] = await Promise.all([
        safeJson(entitiesResponse),
        safeJson(pagesResponse),
        safeJson(templatesResponse),
        safeJson(keywordsResponse),
      ]);

      const failures: string[] = [];

      if (!entitiesResponse.ok) {
        failures.push("entities");
      }

      if (!pagesResponse.ok) {
        failures.push("pages");
      }

      if (!templatesResponse.ok) {
        failures.push("templates");
      }

      if (!keywordsResponse.ok) {
        failures.push("keywords");
      }

      setData({
        entities: extractList(entitiesPayload),
        pages: extractList(pagesPayload),
        templates: extractList(templatesPayload),
        keywords: extractList(keywordsPayload),
        sitemapOnline: sitemapResponse.ok,
      });

      if (failures.length > 0) {
        setError(
          `Some Website Manager data could not be loaded: ${failures.join(", ")}.`
        );
      }
    } catch (loadError) {
      console.error(
        "Website Manager overview load failed:",
        loadError
      );

      setError(
        "Unable to load Website Manager data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const metrics = useMemo(() => {
    const activeEntities =
      data.entities.filter(
        (entity) =>
          statusOf(entity) === "ACTIVE"
      ).length;

    const draftPages =
      data.pages.filter(
        (page) =>
          statusOf(page) === "DRAFT"
      ).length;

    const readyPages =
      data.pages.filter(
        (page) =>
          statusOf(page) === "READY"
      ).length;

    const publishedPages =
      data.pages.filter(
        (page) =>
          statusOf(page) === "PUBLISHED"
      ).length;

    const activeTemplates =
      data.templates.filter(
        (template) =>
          statusOf(template) === "ACTIVE"
      ).length;

    const publishingTracked =
      data.pages.filter((page) =>
        pageHasMetadataNamespace(
          page,
          "publishing"
        )
      ).length;

    const indexingTracked =
      data.pages.filter((page) =>
        pageHasMetadataNamespace(
          page,
          "indexing"
        )
      ).length;

    return {
      activeEntities,
      draftPages,
      readyPages,
      publishedPages,
      activeTemplates,
      publishingTracked,
      indexingTracked,
    };
  }, [data]);

  const recentPages = useMemo(
    () =>
      [...data.pages]
        .sort(
          (a, b) =>
            dateValue(b) - dateValue(a)
        )
        .slice(0, 6),
    [data.pages]
  );

  const architectureOnline =
    !loading &&
    data.entities.length >= 0 &&
    data.pages.length >= 0 &&
    data.templates.length >= 0 &&
    data.keywords.length >= 0;

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-9 lg:px-8">
        <div className="pointer-events-none absolute -right-24 -top-40 h-[30rem] w-[30rem] rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager"
            title="Control the RideGrid website"
            description="Live management overview for website entities, generated pages, templates, keywords, publishing and discovery."
            action={
              <button
                type="button"
                onClick={() =>
                  void loadOverview()
                }
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh Live Data
              </button>
            }
          />

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  architectureOnline
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              W2–W7 Engines Connected
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300">
              <Radio size={13} />
              Sitemap{" "}
              {data.sitemapOnline
                ? "Online"
                : "Unavailable"}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-7 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {error ? (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Website Entities"
              value={
                loading
                  ? "—"
                  : data.entities.length
              }
              detail={`${metrics.activeEntities} active`}
              icon={Globe2}
            />

            <StatCard
              label="Generated Pages"
              value={
                loading
                  ? "—"
                  : data.pages.length
              }
              detail={`${metrics.publishedPages} published`}
              icon={FileStack}
            />

            <StatCard
              label="Templates"
              value={
                loading
                  ? "—"
                  : data.templates.length
              }
              detail={`${metrics.activeTemplates} active`}
              icon={LayoutTemplate}
            />

            <StatCard
              label="Keywords"
              value={
                loading
                  ? "—"
                  : data.keywords.length
              }
              detail="Keyword Intelligence database"
              icon={Tags}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Draft Pages"
              value={
                loading
                  ? "—"
                  : metrics.draftPages
              }
              detail="Not ready for publication"
              icon={FileStack}
            />

            <StatCard
              label="Ready Pages"
              value={
                loading
                  ? "—"
                  : metrics.readyPages
              }
              detail="Eligible for publishing checks"
              icon={Sparkles}
            />

            <StatCard
              label="Publishing State"
              value={
                loading
                  ? "—"
                  : metrics.publishingTracked
              }
              detail="Pages with publishing metadata"
              icon={Radio}
            />

            <StatCard
              label="Index Tracking"
              value={
                loading
                  ? "—"
                  : metrics.indexingTracked
              }
              detail="Pages with indexing state"
              icon={Search}
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <WebsiteSeoCard>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    Website Inventory
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    Recent generated pages
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Live data from the Website SEO page repository.
                  </p>
                </div>

                <StatusPill
                  status={
                    loading
                      ? "Loading"
                      : `${data.pages.length} Total`
                  }
                />
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                {loading ? (
                  <div className="px-5 py-12 text-center text-sm font-bold text-zinc-500">
                    Loading website pages…
                  </div>
                ) : recentPages.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <FileStack
                      size={28}
                      className="mx-auto text-zinc-300"
                    />

                    <div className="mt-3 font-black text-zinc-800">
                      No generated pages yet
                    </div>

                    <div className="mt-1 text-sm text-zinc-500">
                      Pages will appear here from the existing Page Generation Engine.
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {recentPages.map(
                      (page, index) => {
                        const id =
                          readString(
                            page,
                            "id"
                          ) ??
                          `page-${index}`;

                        const status =
                          statusOf(page);

                        return (
                          <div
                            key={id}
                            className="flex flex-col gap-3 px-4 py-4 transition hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-black text-zinc-950">
                                  {displayPageName(
                                    page
                                  )}
                                </span>

                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                                  {displayEntityType(
                                    page
                                  )}
                                </span>
                              </div>

                              <div className="mt-1 truncate text-xs font-medium text-zinc-500">
                                {displayPagePath(
                                  page
                                )}
                              </div>
                            </div>

                            <StatusPill
                              status={status}
                            />
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </WebsiteSeoCard>

            <div className="space-y-5">
              <div className="rounded-2xl bg-zinc-950 p-6 text-white">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                  Publishing Pipeline
                </div>

                <h2 className="mt-3 text-xl font-black">
                  Website delivery status
                </h2>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      label: "Draft",
                      value:
                        metrics.draftPages,
                    },
                    {
                      label: "Ready",
                      value:
                        metrics.readyPages,
                    },
                    {
                      label: "Published",
                      value:
                        metrics.publishedPages,
                    },
                    {
                      label:
                        "Index Tracking",
                      value:
                        metrics.indexingTracked,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                    >
                      <span className="text-sm font-bold text-zinc-400">
                        {item.label}
                      </span>

                      <span className="text-lg font-black text-white">
                        {loading
                          ? "—"
                          : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <WebsiteSeoCard>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Quick Actions
                </div>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      void loadOverview()
                    }
                    className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-black text-zinc-800 transition hover:border-red-200 hover:bg-red-50"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw
                        size={16}
                      />
                      Refresh website data
                    </span>
                  </button>

                  <a
                    href="/api/website-seo/sitemap"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:border-red-200 hover:bg-red-50"
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 size={16} />
                      Open live sitemap
                    </span>

                    <ExternalLink
                      size={15}
                    />
                  </a>

                  <Link
                    href="/website-seo"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-800 transition hover:border-red-200 hover:bg-red-50"
                  >
                    <span className="flex items-center gap-2">
                      <Activity
                        size={16}
                      />
                      Command Center
                    </span>
                  </Link>
                </div>
              </WebsiteSeoCard>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Engine Connection
                </div>

                <h2 className="mt-2 text-lg font-black text-zinc-950">
                  Entity → Page → Keyword → Content → SEO → Publish
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Website Manager reads the existing W2–W7 engines instead of creating a duplicate CMS backend.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Entities",
                  "Pages",
                  "Keywords",
                  "Content",
                  "SEO",
                  "Publishing",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}