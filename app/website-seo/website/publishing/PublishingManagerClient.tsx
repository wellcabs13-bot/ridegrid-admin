"use client";

import {
  Activity,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  Globe2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Unplug,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";

interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

interface WebsitePage {
  id: string;
  entityId: string;
  templateId?: string;
  pathname: string;
  status: string;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;

  entity?: {
    id?: string;
    name?: string;
    type?: string;
    status?: string;
  };
}

interface PublishingIssue {
  code: string;
  message: string;
}

interface PublishingReadiness {
  ready: boolean;
  blockingIssues: PublishingIssue[];
  warnings: PublishingIssue[];
  reasonCodes: string[];
}

interface DiscoveryRecord {
  published?: boolean;
  crawlEligible?: boolean;
  sitemapIncluded?: boolean;

  url?: {
    path?: string | null;
    absoluteUrl?: string | null;
  };

  internalLinks?: string[];
}

interface PublicationPreview {
  pageId: string;
  status: string;
  readiness: PublishingReadiness;
  discovery?: DiscoveryRecord | null;

  activity?: {
    action?: string;
    outcome?: string;
    occurredAt?: string | null;
  } | null;

  plan?: {
    canonical?: {
      kind?: string;
      path?: string | null;
      url?: string | null;
    };

    metadata?: {
      title?: string;
      description?: string;
    };

    sitemapEligibility?: {
      eligible?: boolean;
    };

    indexability?: {
      indexable?: boolean;
      reasonCodes?: string[];
    };

    quality?: {
      status?: string;
      score?: number;
      warnings?: PublishingIssue[];
    };
  };
}

interface StoredIndexState {
  provider: string | null;
  requestState: string | null;
  coverage: string | null;
  crawl: string | null;
  observedAt: string | null;
}

interface OperationFeedback {
  title: string;
  data: unknown;
}

const PAGE_STATUSES = [
  "DRAFT",
  "READY",
  "PUBLISHED",
  "ARCHIVED",
] as const;

function asRecord(
  value: unknown
): Record<string, unknown> | null {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? (value as Record<string, unknown>)
    : null;
}

function textValue(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function booleanValue(
  value: unknown
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function storedIndexState(
  metadata: unknown
): StoredIndexState {
  const meta =
    asRecord(metadata);

  const indexing =
    asRecord(
      meta?.indexing
    );

  const observation =
    asRecord(
      indexing?.observation
    );

  const external =
    asRecord(
      observation?.external
    );

  return {
    provider:
      textValue(
        observation?.provider
      ),

    requestState:
      textValue(
        observation?.requestState
      ),

    coverage:
      textValue(
        external?.coverage
      ),

    crawl:
      textValue(
        external?.crawl
      ),

    observedAt:
      textValue(
        external?.observedAt
      ),
  };
}

function statusClass(
  status: string
): string {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-50 text-emerald-700";

    case "READY":
      return "bg-blue-50 text-blue-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "ARCHIVED":
      return "bg-zinc-200 text-zinc-600";

    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function labelize(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "Not available";
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? "Not available"
    : parsed.toLocaleString();
}

async function parseApi<T>(
  response: Response
): Promise<ApiEnvelope<T>> {
  try {
    return (
      await response.json()
    ) as ApiEnvelope<T>;
  }
  catch {
    return {
      ok: false,
      error:
        "Server returned an invalid response.",
    };
  }
}

export default function PublishingManagerClient() {
  const [pages, setPages] =
    useState<WebsitePage[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(
      null
    );

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [operationLoading, setOperationLoading] =
    useState<string | null>(
      null
    );

  const [preview, setPreview] =
    useState<PublicationPreview | null>(
      null
    );

  const [operation, setOperation] =
    useState<OperationFeedback | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const loadPages =
    useCallback(
      async (
        preferredId?: string
      ) => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/website-seo/pages",
              {
                cache: "no-store",
              }
            );

          const payload =
            await parseApi<WebsitePage[]>(
              response
            );

          if (
            !response.ok ||
            !payload.ok ||
            !Array.isArray(
              payload.data
            )
          ) {
            throw new Error(
              payload.error ??
                "Unable to load generated pages."
            );
          }

          const rows =
            payload.data;

          setPages(
            rows
          );

          setSelectedId(
            (current) => {
              if (
                preferredId &&
                rows.some(
                  (page) =>
                    page.id ===
                    preferredId
                )
              ) {
                return preferredId;
              }

              if (
                current &&
                rows.some(
                  (page) =>
                    page.id ===
                    current
                )
              ) {
                return current;
              }

              return rows.length > 0
                ? rows[0].id
                : null;
            }
          );
        }
        catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load generated pages."
          );
        }
        finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const selected =
    useMemo(
      () =>
        pages.find(
          (page) =>
            page.id ===
            selectedId
        ) ?? null,
      [
        pages,
        selectedId,
      ]
    );

  const previewPage =
    useCallback(
      async (
        page: WebsitePage
      ) => {
        setPreviewLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/website-seo/publishing/preview",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    entityId:
                      page.entityId,

                    pageId:
                      page.id,
                  }),
              }
            );

          const payload =
            await parseApi<PublicationPreview>(
              response
            );

          if (
            !response.ok ||
            !payload.ok ||
            !payload.data
          ) {
            throw new Error(
              payload.error ??
                "Unable to evaluate publishing readiness."
            );
          }

          setPreview(
            payload.data
          );
        }
        catch (previewError) {
          setPreview(null);

          setError(
            previewError instanceof Error
              ? previewError.message
              : "Unable to evaluate publishing readiness."
          );
        }
        finally {
          setPreviewLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    setPreview(null);
    setOperation(null);
    setMessage(null);

    if (selected) {
      void previewPage(
        selected
      );
    }
  }, [
    selected,
    previewPage,
  ]);

  const filteredPages =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return pages.filter(
        (page) => {
          if (
            statusFilter !==
              "ALL" &&
            page.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            page.pathname,
            page.status,
            page.entityId,
            page.entity?.name ?? "",
            page.entity?.type ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      pages,
      search,
      statusFilter,
    ]);

  const counts =
    useMemo(
      () => ({
        total:
          pages.length,

        ready:
          pages.filter(
            (page) =>
              page.status ===
              "READY"
          ).length,

        published:
          pages.filter(
            (page) =>
              page.status ===
              "PUBLISHED"
          ).length,

        draft:
          pages.filter(
            (page) =>
              page.status ===
              "DRAFT"
          ).length,
      }),
      [pages]
    );

  async function runAction(
    action:
      | "publish"
      | "unpublish"
      | "sync"
  ) {
    if (!selected) {
      return;
    }

    setOperationLoading(
      action
    );

    setError(null);
    setMessage(null);

    try {
      const endpoint =
        action === "sync"
          ? "/api/website-seo/indexing/sync"
          : `/api/website-seo/publishing/${action}`;

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                entityId:
                  selected.entityId,

                pageId:
                  selected.id,
              }),
          }
        );

      const payload =
        await parseApi<unknown>(
          response
        );

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ??
            `Unable to ${action} page.`
        );
      }

      setOperation({
        title:
          action === "publish"
            ? "Publish Result"
            : action === "unpublish"
              ? "Unpublish Result"
              : "Discovery Sync Result",

        data:
          payload.data ?? null,
      });

      setMessage(
        action === "publish"
          ? "Publish operation completed."
          : action === "unpublish"
            ? "Unpublish operation completed."
            : "Discovery synchronization completed."
      );

      await loadPages(
        selected.id
      );

      await previewPage(
        selected
      );
    }
    catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : `Unable to ${action} page.`
      );
    }
    finally {
      setOperationLoading(
        null
      );
    }
  }

  const storedIndex =
    selected
      ? storedIndexState(
          selected.metadata
        )
      : null;

  const publicUrl =
    preview?.discovery?.url
      ?.absoluteUrl ??
    preview?.plan?.canonical
      ?.url ??
    null;

  const canonicalPath =
    preview?.plan?.canonical
      ?.path ??
    selected?.pathname ??
    null;

  const sitemapIncluded =
    preview?.discovery
      ?.sitemapIncluded;

  const crawlEligible =
    preview?.discovery
      ?.crawlEligible;

  const indexable =
    preview?.plan
      ?.indexability
      ?.indexable;

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-8 lg:px-8">
        <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager · Publishing"
            title="Publishing & Discovery"
            description="Publish, unpublish, preview and synchronize eligible RideGrid website pages through the frozen W7 Publishing + Indexing Engine."
            action={
              <div className="flex gap-2">
                <a
                  href="/api/website-seo/sitemap"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-black text-white hover:border-red-500"
                >
                  <Globe2
                    size={16}
                  />
                  Sitemap
                </a>

                <button
                  type="button"
                  onClick={() =>
                    void loadPages()
                  }
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-black text-white hover:border-red-500 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Reload
                </button>
              </div>
            }
          />

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [
                "Total Pages",
                counts.total,
              ],
              [
                "Ready",
                counts.ready,
              ],
              [
                "Published",
                counts.published,
              ],
              [
                "Draft",
                counts.draft,
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={String(
                    label
                  )}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
                >
                  <div className="text-xs font-black uppercase tracking-wide text-zinc-500">
                    {label}
                  </div>

                  <div className="mt-1 text-2xl font-black text-white">
                    {loading
                      ? "—"
                      : value}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <CheckCircle2
                size={16}
              />
              {message}
            </div>
          ) : null}

          <WebsiteSeoCard>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <label className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3.5 text-zinc-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search pathname, entity or status..."
                  className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-red-400"
                />
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
              >
                <option value="ALL">
                  All Statuses
                </option>

                {PAGE_STATUSES.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {labelize(
                        value
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          </WebsiteSeoCard>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(300px,.65fr)_minmax(0,1.35fr)]">
            <WebsiteSeoCard>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                Publishing Inventory
              </div>

              <h2 className="mt-2 text-xl font-black text-zinc-950">
                {
                  filteredPages.length
                }{" "}
                pages
              </h2>

              <div className="mt-5 max-h-[800px] overflow-y-auto rounded-xl border border-zinc-200">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-red-600" />
                  </div>
                ) : filteredPages.length ===
                  0 ? (
                  <div className="py-16 text-center text-sm font-bold text-zinc-500">
                    No generated pages found.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {filteredPages.map(
                      (page) => (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() =>
                            setSelectedId(
                              page.id
                            )
                          }
                          className={`block w-full px-4 py-4 text-left ${
                            selectedId ===
                            page.id
                              ? "bg-red-50"
                              : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-black text-zinc-950">
                                {page.entity
                                  ?.name ??
                                  page.pathname}
                              </div>

                              <div className="mt-1 truncate text-xs font-bold text-zinc-500">
                                {
                                  page.pathname
                                }
                              </div>

                              {page.entity
                                ?.type ? (
                                <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                                  {
                                    page.entity
                                      .type
                                  }
                                </div>
                              ) : null}
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusClass(
                                page.status
                              )}`}
                            >
                              {
                                page.status
                              }
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </WebsiteSeoCard>

            <div className="space-y-5">
              <WebsiteSeoCard>
                {!selected ? (
                  <div className="py-20 text-center">
                    <FileCheck2
                      size={36}
                      className="mx-auto text-zinc-300"
                    />

                    <div className="mt-3 font-black text-zinc-800">
                      Select a generated page
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 border-b border-zinc-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                          Publication Control
                        </div>

                        <h2 className="mt-2 truncate text-xl font-black text-zinc-950">
                          {selected.entity
                            ?.name ??
                            selected.pathname}
                        </h2>

                        <div className="mt-1 break-all text-xs font-bold text-zinc-500">
                          {
                            selected.pathname
                          }
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${statusClass(
                          selected.status
                        )}`}
                      >
                        {
                          selected.status
                        }
                      </span>
                    </div>

                    {previewLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-red-600" />
                      </div>
                    ) : preview ? (
                      <>
                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-zinc-200 p-4">
                            <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                              Readiness
                            </div>

                            <div
                              className={`mt-2 text-sm font-black ${
                                preview.readiness.ready
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {preview.readiness.ready
                                ? "READY TO PUBLISH"
                                : "BLOCKED"}
                            </div>
                          </div>

                          <div className="rounded-xl border border-zinc-200 p-4">
                            <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                              Indexable
                            </div>

                            <div className="mt-2 text-sm font-black text-zinc-950">
                              {indexable === true
                                ? "YES"
                                : indexable === false
                                  ? "NO"
                                  : "UNKNOWN"}
                            </div>
                          </div>

                          <div className="rounded-xl border border-zinc-200 p-4">
                            <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                              Crawl Eligible
                            </div>

                            <div className="mt-2 text-sm font-black text-zinc-950">
                              {crawlEligible === true
                                ? "YES"
                                : crawlEligible === false
                                  ? "NO"
                                  : "UNKNOWN"}
                            </div>
                          </div>

                          <div className="rounded-xl border border-zinc-200 p-4">
                            <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                              Sitemap
                            </div>

                            <div className="mt-2 text-sm font-black text-zinc-950">
                              {sitemapIncluded === true
                                ? "INCLUDED"
                                : sitemapIncluded === false
                                  ? "NOT INCLUDED"
                                  : "UNKNOWN"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-zinc-200 p-4">
                            <div className="text-xs font-black uppercase tracking-wide text-zinc-500">
                              Canonical / Public URL
                            </div>

                            <div className="mt-2 break-all text-sm font-bold text-zinc-900">
                              {publicUrl ??
                                canonicalPath ??
                                "Unavailable"}
                            </div>

                            {publicUrl ? (
                              <a
                                href={
                                  publicUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-xs font-black text-red-600"
                              >
                                <ExternalLink
                                  size={13}
                                />
                                Open Public Page
                              </a>
                            ) : null}
                          </div>

                          <div className="rounded-xl border border-zinc-200 p-4">
                            <div className="text-xs font-black uppercase tracking-wide text-zinc-500">
                              Search / Discovery State
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <div className="font-black text-zinc-400">
                                  Request
                                </div>

                                <div className="mt-1 font-bold text-zinc-900">
                                  {storedIndex
                                    ?.requestState ??
                                    "NOT SENT"}
                                </div>
                              </div>

                              <div>
                                <div className="font-black text-zinc-400">
                                  Coverage
                                </div>

                                <div className="mt-1 font-bold text-zinc-900">
                                  {storedIndex
                                    ?.coverage ??
                                    "UNKNOWN"}
                                </div>
                              </div>

                              <div>
                                <div className="font-black text-zinc-400">
                                  Crawl
                                </div>

                                <div className="mt-1 font-bold text-zinc-900">
                                  {storedIndex
                                    ?.crawl ??
                                    "UNKNOWN"}
                                </div>
                              </div>

                              <div>
                                <div className="font-black text-zinc-400">
                                  Provider
                                </div>

                                <div className="mt-1 font-bold text-zinc-900">
                                  {storedIndex
                                    ?.provider ??
                                    "LOCAL"}
                                </div>
                              </div>
                            </div>

                            {storedIndex
                              ?.observedAt ? (
                              <div className="mt-3 text-[11px] font-semibold text-zinc-400">
                                Observed{" "}
                                {formatDate(
                                  storedIndex.observedAt
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {preview.readiness
                          .blockingIssues
                          .length > 0 ? (
                          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-red-700">
                              <CircleAlert
                                size={15}
                              />
                              Blocking Issues
                            </div>

                            <div className="mt-3 space-y-2">
                              {preview.readiness.blockingIssues.map(
                                (
                                  issue
                                ) => (
                                  <div
                                    key={`${issue.code}-${issue.message}`}
                                    className="rounded-lg bg-white px-3 py-2 text-xs text-red-700"
                                  >
                                    <span className="font-black">
                                      {
                                        issue.code
                                      }
                                      :
                                    </span>{" "}
                                    {
                                      issue.message
                                    }
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ) : null}

                        {preview.readiness
                          .warnings
                          .length > 0 ? (
                          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="text-xs font-black uppercase tracking-wide text-amber-700">
                              Warnings
                            </div>

                            <div className="mt-3 space-y-2">
                              {preview.readiness.warnings.map(
                                (
                                  warning
                                ) => (
                                  <div
                                    key={`${warning.code}-${warning.message}`}
                                    className="text-xs text-amber-800"
                                  >
                                    <span className="font-black">
                                      {
                                        warning.code
                                      }
                                      :
                                    </span>{" "}
                                    {
                                      warning.message
                                    }
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-6 flex flex-wrap gap-3 border-t border-zinc-100 pt-5">
                          <button
                            type="button"
                            onClick={() =>
                              void previewPage(
                                selected
                              )
                            }
                            disabled={
                              previewLoading ||
                              operationLoading !==
                                null
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-800 disabled:opacity-40"
                          >
                            <RefreshCw
                              size={15}
                            />
                            Refresh Readiness
                          </button>

                          {selected.status !==
                          "PUBLISHED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(
                                  "publish"
                                )
                              }
                              disabled={
                                operationLoading !==
                                  null ||
                                !preview.readiness
                                  .ready
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:opacity-40"
                            >
                              {operationLoading ===
                              "publish" ? (
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Send
                                  size={15}
                                />
                              )}

                              Publish
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void runAction(
                                    "sync"
                                  )
                                }
                                disabled={
                                  operationLoading !==
                                    null ||
                                  !preview.readiness
                                    .ready
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:opacity-40"
                              >
                                {operationLoading ===
                                "sync" ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Activity
                                    size={15}
                                  />
                                )}

                                Sync Discovery
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void runAction(
                                    "unpublish"
                                  )
                                }
                                disabled={
                                  operationLoading !==
                                  null
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-40"
                              >
                                {operationLoading ===
                                "unpublish" ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Unplug
                                    size={15}
                                  />
                                )}

                                Unpublish
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="py-12 text-center text-sm font-bold text-zinc-500">
                        Readiness data is unavailable.
                      </div>
                    )}
                  </>
                )}
              </WebsiteSeoCard>

              {operation ? (
                <WebsiteSeoCard>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    <RotateCcw
                      size={14}
                    />
                    {
                      operation.title
                    }
                  </div>

                  <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-300">
                    {JSON.stringify(
                      operation.data,
                      null,
                      2
                    )}
                  </pre>
                </WebsiteSeoCard>
              ) : null}

              <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                  W7 Publishing Contract
                </div>

                <div className="mt-3 text-sm leading-6 text-zinc-400">
                  This manager does not publish directly. Every preview,
                  publish, unpublish and discovery synchronization request
                  is delegated to the frozen W7 Publishing + Indexing
                  Engine and its readiness guardrails.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}