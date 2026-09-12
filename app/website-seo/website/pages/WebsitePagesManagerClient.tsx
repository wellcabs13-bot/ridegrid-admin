"use client";

import {
  BrainCircuit,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileStack,
  Filter,
  Globe2,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
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

type PageAction =
  | "regenerate"
  | "content"
  | "seo"
  | "preview"
  | "publish"
  | "unpublish"
  | "sync";

const pageStatuses = [
  "ALL",
  "DRAFT",
  "READY",
  "PUBLISHED",
  "ARCHIVED",
] as const;

const entityTypes = [
  "ALL",
  "ROUTE",
  "CITY",
  "SERVICE",
  "AIRPORT",
  "AREA",
  "VEHICLE",
] as const;

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

function readRecord(
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

  if (Array.isArray(payload.data)) {
    return payload.data.filter(isRecord);
  }

  return [];
}

function extractError(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const error = payload.error;

  return typeof error === "string"
    ? error
    : null;
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

function statusOf(page: RecordValue): string {
  return (
    readString(page, "status")?.toUpperCase() ??
    "UNKNOWN"
  );
}

function entityTypeOf(page: RecordValue): string {
  return (
    readString(page, "entityType")?.toUpperCase() ??
    "UNKNOWN"
  );
}

function pagePath(page: RecordValue): string | undefined {
  return (
    readString(page, "pathname") ??
    readString(page, "path") ??
    readString(page, "canonicalPath")
  );
}

function entityName(page: RecordValue): string | undefined {
  const directEntity = readRecord(page, "entity");

  if (directEntity) {
    const directName = readString(
      directEntity,
      "name"
    );

    if (directName) {
      return directName;
    }
  }

  const definition =
    readRecord(page, "definition");

  const definitionEntity = definition
    ? readRecord(definition, "entity")
    : undefined;

  if (definitionEntity) {
    const name = readString(
      definitionEntity,
      "name"
    );

    if (name) {
      return name;
    }
  }

  return (
    readString(page, "entitySlug") ??
    undefined
  );
}

function templateName(page: RecordValue): string {
  const template =
    readRecord(page, "template");

  if (template) {
    const name =
      readString(template, "name");

    if (name) {
      return name;
    }
  }

  const definition =
    readRecord(page, "definition");

  const snapshot = definition
    ? readRecord(definition, "template")
    : undefined;

  if (snapshot) {
    const name =
      readString(snapshot, "name");

    if (name) {
      return name;
    }
  }

  return (
    readString(page, "templateKey") ??
    readString(page, "templateId") ??
    "Template unavailable"
  );
}

function pageTitle(page: RecordValue): string {
  return (
    readString(page, "title") ??
    entityName(page) ??
    readString(page, "entitySlug") ??
    pagePath(page) ??
    "Generated page"
  );
}

function updatedTimestamp(
  page: RecordValue
): number {
  const value =
    readString(page, "updatedAt") ??
    readString(page, "createdAt");

  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed)
    ? 0
    : parsed;
}

function formatDate(
  value: string | undefined
): string {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unavailable";
  }

  return parsed.toLocaleString();
}

function hasNamespace(
  page: RecordValue,
  namespace: string
): boolean {
  const metadata =
    readRecord(page, "metadata");

  return Boolean(
    metadata &&
      isRecord(metadata[namespace])
  );
}

function hasContent(page: RecordValue): boolean {
  const content = page.content;

  if (
    typeof content === "string" &&
    content.trim()
  ) {
    return true;
  }

  return isRecord(content);
}

function statusTone(status: string): string {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "bg-emerald-50 text-emerald-700";
    case "READY":
      return "bg-blue-50 text-blue-700";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    case "ARCHIVED":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  loading,
  disabled,
  danger = false,
}: {
  label: string;
  icon: typeof Sparkles;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-zinc-200 bg-white text-zinc-800 hover:border-red-200 hover:bg-red-50"
      }`}
    >
      {loading ? (
        <Loader2
          size={15}
          className="animate-spin"
        />
      ) : (
        <Icon size={15} />
      )}

      {label}
    </button>
  );
}

export default function WebsitePagesManagerClient() {
  const [pages, setPages] =
    useState<RecordValue[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [entityFilter, setEntityFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [busyAction, setBusyAction] =
    useState<PageAction | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadPages = useCallback(
    async (preferredId?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/website-seo/pages",
          {
            cache: "no-store",
          }
        );

        const payload =
          await safeJson(response);

        if (!response.ok) {
          throw new Error(
            extractError(payload) ??
              "Unable to load website pages."
          );
        }

        const rows = extractList(payload);

        rows.sort(
          (a, b) =>
            updatedTimestamp(b) -
            updatedTimestamp(a)
        );

        setPages(rows);

        setSelectedId((current) => {
          if (
            preferredId &&
            rows.some(
              (row) =>
                readString(row, "id") ===
                preferredId
            )
          ) {
            return preferredId;
          }

          if (
            current &&
            rows.some(
              (row) =>
                readString(row, "id") ===
                current
            )
          ) {
            return current;
          }

          return rows.length > 0
            ? readString(rows[0], "id") ??
                null
            : null;
        });
      } catch (loadError) {
        console.error(
          "Website Pages Manager load failed:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load website pages."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const filteredPages = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return pages.filter((page) => {
      if (
        statusFilter !== "ALL" &&
        statusOf(page) !== statusFilter
      ) {
        return false;
      }

      if (
        entityFilter !== "ALL" &&
        entityTypeOf(page) !== entityFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        pageTitle(page),
        pagePath(page) ?? "",
        entityName(page) ?? "",
        entityTypeOf(page),
        templateName(page),
        readString(page, "entitySlug") ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    pages,
    search,
    statusFilter,
    entityFilter,
  ]);

  const selectedPage = useMemo(
    () =>
      pages.find(
        (page) =>
          readString(page, "id") ===
          selectedId
      ) ?? null,
    [pages, selectedId]
  );

  const counts = useMemo(
    () => ({
      total: pages.length,
      draft: pages.filter(
        (page) =>
          statusOf(page) === "DRAFT"
      ).length,
      ready: pages.filter(
        (page) =>
          statusOf(page) === "READY"
      ).length,
      published: pages.filter(
        (page) =>
          statusOf(page) === "PUBLISHED"
      ).length,
    }),
    [pages]
  );

  const runAction = useCallback(
    async (action: PageAction) => {
      if (!selectedPage) {
        return;
      }

      const pageId =
        readString(selectedPage, "id");

      const entityId =
        readString(
          selectedPage,
          "entityId"
        );

      const templateId =
        readString(
          selectedPage,
          "templateId"
        );

      if (!pageId || !entityId) {
        setError(
          "Selected page does not contain the required page/entity identifiers."
        );

        return;
      }

      setBusyAction(action);
      setError(null);
      setMessage(null);

      try {
        let endpoint = "";
        let body: Record<string, unknown> = {};

        switch (action) {
          case "regenerate":
            endpoint =
              "/api/website-seo/pages/generate";

            body = {
              entityId,
              ...(templateId
                ? { templateId }
                : {}),
            };
            break;

          case "content":
            endpoint =
              "/api/website-seo/content/generate";

            body = {
              entityId,
              pageId,
              persist: true,
            };
            break;

          case "seo":
            endpoint =
              "/api/website-seo/seo/generate";

            body = {
              entityId,
              pageId,
              persist: true,
            };
            break;

          case "preview":
            endpoint =
              "/api/website-seo/publishing/preview";

            body = {
              entityId,
              pageId,
            };
            break;

          case "publish":
            endpoint =
              "/api/website-seo/publishing/publish";

            body = {
              entityId,
              pageId,
            };
            break;

          case "unpublish":
            endpoint =
              "/api/website-seo/publishing/unpublish";

            body = {
              entityId,
              pageId,
            };
            break;

          case "sync":
            endpoint =
              "/api/website-seo/indexing/sync";

            body = {
              entityId,
              pageId,
            };
            break;
        }

        const response = await fetch(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        const payload =
          await safeJson(response);

        if (!response.ok) {
          throw new Error(
            extractError(payload) ??
              `${action} operation failed.`
          );
        }

        const labels: Record<
          PageAction,
          string
        > = {
          regenerate:
            "Page regenerated successfully.",
          content:
            "Content generated and persisted.",
          seo:
            "SEO plan generated and persisted.",
          preview:
            "Publication readiness check passed.",
          publish:
            "Page published successfully.",
          unpublish:
            "Page unpublished successfully.",
          sync:
            "Indexing/discovery state synchronized.",
        };

        setMessage(labels[action]);

        await loadPages(pageId);
      } catch (actionError) {
        console.error(
          `Website page ${action} failed:`,
          actionError
        );

        setError(
          actionError instanceof Error
            ? actionError.message
            : `${action} operation failed.`
        );
      } finally {
        setBusyAction(null);
      }
    },
    [selectedPage, loadPages]
  );

  const selectedStatus =
    selectedPage
      ? statusOf(selectedPage)
      : "UNKNOWN";

  const selectedPath =
    selectedPage
      ? pagePath(selectedPage)
      : undefined;

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-8 lg:px-8">
        <div className="pointer-events-none absolute -right-24 -top-36 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager · Pages"
            title="Generated Website Pages"
            description="Manage real RideGrid website pages through the existing Page, Content, SEO, Publishing and Indexing engines."
            action={
              <button
                type="button"
                onClick={() =>
                  void loadPages()
                }
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh Pages
              </button>
            }
          />

          <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total",
                value: counts.total,
              },
              {
                label: "Draft",
                value: counts.draft,
              },
              {
                label: "Ready",
                value: counts.ready,
              },
              {
                label: "Published",
                value: counts.published,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
              >
                <div className="text-xs font-black uppercase tracking-wider text-zinc-500">
                  {item.label}
                </div>

                <div className="mt-1 text-2xl font-black text-white">
                  {loading
                    ? "—"
                    : item.value}
                </div>
              </div>
            ))}
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
              <CheckCircle2 size={16} />
              {message}
            </div>
          ) : null}

          <WebsiteSeoCard>
            <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
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
                  placeholder="Search page, route, city, path or template..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <label className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-3.5 text-zinc-400"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-3 pl-9 pr-4 text-sm font-bold text-zinc-700 outline-none focus:border-red-400"
                >
                  {pageStatuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status === "ALL"
                          ? "All Statuses"
                          : status}
                      </option>
                    )
                  )}
                </select>
              </label>

              <select
                value={entityFilter}
                onChange={(event) =>
                  setEntityFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-400"
              >
                {entityTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type === "ALL"
                        ? "All Entity Types"
                        : type}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mt-3 text-xs font-bold text-zinc-500">
              Showing{" "}
              {filteredPages.length} of{" "}
              {pages.length} real generated pages
            </div>
          </WebsiteSeoCard>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
            <WebsiteSeoCard className="overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    Page Inventory
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    Website pages
                  </h2>
                </div>

                <FileStack
                  size={22}
                  className="text-zinc-300"
                />
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm font-bold text-zinc-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Loading real pages…
                  </div>
                ) : filteredPages.length === 0 ? (
                  <div className="px-5 py-16 text-center">
                    <FileStack
                      size={30}
                      className="mx-auto text-zinc-300"
                    />

                    <div className="mt-3 font-black text-zinc-800">
                      No pages match these filters
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[690px] divide-y divide-zinc-100 overflow-y-auto">
                    {filteredPages.map(
                      (page, index) => {
                        const id =
                          readString(
                            page,
                            "id"
                          ) ??
                          `row-${index}`;

                        const selected =
                          id === selectedId;

                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setSelectedId(
                                id
                              )
                            }
                            className={`block w-full px-4 py-4 text-left transition ${
                              selected
                                ? "bg-red-50"
                                : "bg-white hover:bg-zinc-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate font-black text-zinc-950">
                                    {pageTitle(
                                      page
                                    )}
                                  </div>

                                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                                    {entityTypeOf(
                                      page
                                    )}
                                  </span>
                                </div>

                                <div className="mt-1 truncate text-xs font-semibold text-zinc-500">
                                  {pagePath(
                                    page
                                  ) ??
                                    "Path unavailable"}
                                </div>

                                <div className="mt-2 text-[11px] font-medium text-zinc-400">
                                  {templateName(
                                    page
                                  )}
                                </div>
                              </div>

                              <StatusPill
                                status={statusOf(
                                  page
                                )}
                              />
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </WebsiteSeoCard>

            <div>
              <WebsiteSeoCard>
                {!selectedPage ? (
                  <div className="py-16 text-center">
                    <Eye
                      size={30}
                      className="mx-auto text-zinc-300"
                    />

                    <div className="mt-3 font-black text-zinc-800">
                      Select a page
                    </div>

                    <div className="mt-1 text-sm text-zinc-500">
                      Page actions and live status will appear here.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                          Page Details
                        </div>

                        <h2 className="mt-2 truncate text-xl font-black text-zinc-950">
                          {pageTitle(
                            selectedPage
                          )}
                        </h2>

                        <div className="mt-1 break-all text-xs font-semibold text-zinc-500">
                          {selectedPath ??
                            "Path unavailable"}
                        </div>
                      </div>

                      <StatusPill
                        status={
                          selectedStatus
                        }
                      />
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Entity Type
                        </div>

                        <div className="mt-1 text-sm font-black text-zinc-800">
                          {entityTypeOf(
                            selectedPage
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Template
                        </div>

                        <div className="mt-1 truncate text-sm font-black text-zinc-800">
                          {templateName(
                            selectedPage
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Content
                        </div>

                        <div className="mt-1 text-sm font-black text-zinc-800">
                          {hasContent(
                            selectedPage
                          )
                            ? "Generated"
                            : "Not detected"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          SEO State
                        </div>

                        <div className="mt-1 text-sm font-black text-zinc-800">
                          {hasNamespace(
                            selectedPage,
                            "seo"
                          )
                            ? "Generated"
                            : "Not tracked"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {hasNamespace(
                        selectedPage,
                        "publishing"
                      ) ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                          Publishing tracked
                        </span>
                      ) : null}

                      {hasNamespace(
                        selectedPage,
                        "indexing"
                      ) ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">
                          Indexing tracked
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t border-zinc-100 pt-5">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                        Generation
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <ActionButton
                          label="Regenerate Page"
                          icon={
                            WandSparkles
                          }
                          loading={
                            busyAction ===
                            "regenerate"
                          }
                          disabled={
                            busyAction !==
                              null
                          }
                          onClick={() =>
                            void runAction(
                              "regenerate"
                            )
                          }
                        />

                        <ActionButton
                          label="Generate Content"
                          icon={
                            BrainCircuit
                          }
                          loading={
                            busyAction ===
                            "content"
                          }
                          disabled={
                            busyAction !==
                              null
                          }
                          onClick={() =>
                            void runAction(
                              "content"
                            )
                          }
                        />

                        <ActionButton
                          label="Generate SEO"
                          icon={
                            Sparkles
                          }
                          loading={
                            busyAction ===
                            "seo"
                          }
                          disabled={
                            busyAction !==
                              null
                          }
                          onClick={() =>
                            void runAction(
                              "seo"
                            )
                          }
                        />

                        <ActionButton
                          label="Readiness"
                          icon={
                            ShieldCheck
                          }
                          loading={
                            busyAction ===
                            "preview"
                          }
                          disabled={
                            busyAction !==
                              null
                          }
                          onClick={() =>
                            void runAction(
                              "preview"
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-5 border-t border-zinc-100 pt-5">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                        Publishing
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {selectedStatus ===
                        "PUBLISHED" ? (
                          <ActionButton
                            label="Unpublish"
                            icon={Radio}
                            danger
                            loading={
                              busyAction ===
                              "unpublish"
                            }
                            disabled={
                              busyAction !==
                                null
                            }
                            onClick={() =>
                              void runAction(
                                "unpublish"
                              )
                            }
                          />
                        ) : (
                          <ActionButton
                            label="Publish"
                            icon={Globe2}
                            loading={
                              busyAction ===
                              "publish"
                            }
                            disabled={
                              busyAction !==
                                null
                            }
                            onClick={() =>
                              void runAction(
                                "publish"
                              )
                            }
                          />
                        )}

                        <ActionButton
                          label="Sync Indexing"
                          icon={RefreshCw}
                          loading={
                            busyAction ===
                            "sync"
                          }
                          disabled={
                            busyAction !==
                              null
                          }
                          onClick={() =>
                            void runAction(
                              "sync"
                            )
                          }
                        />
                      </div>

                      {selectedStatus ===
                        "PUBLISHED" &&
                      selectedPath?.startsWith(
                        "/"
                      ) ? (
                        <a
                          href={selectedPath}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-3 text-xs font-black text-white transition hover:bg-black"
                        >
                          <ExternalLink
                            size={15}
                          />
                          Open Public Page
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                      <div>
                        <strong>
                          Updated:
                        </strong>{" "}
                        {formatDate(
                          readString(
                            selectedPage,
                            "updatedAt"
                          )
                        )}
                      </div>

                      <div className="mt-1 break-all">
                        <strong>
                          Page ID:
                        </strong>{" "}
                        {readString(
                          selectedPage,
                          "id"
                        )}
                      </div>
                    </div>
                  </>
                )}
              </WebsiteSeoCard>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}