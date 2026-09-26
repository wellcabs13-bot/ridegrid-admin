"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";
import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";

import {
  EMPTY_WEBSITE_CONTENT_BLOCK_CONTENT,
  WEBSITE_CONTENT_BLOCK_CATEGORIES,
  WEBSITE_CONTENT_BLOCK_PLACEMENTS,
  WEBSITE_CONTENT_BLOCK_SCOPES,
  WEBSITE_CONTENT_BLOCK_STATUSES,
  type WebsiteContentBlock,
  type WebsiteContentBlockCategory,
  type WebsiteContentBlockPlacement,
  type WebsiteContentBlockScope,
  type WebsiteContentBlockStatus,
} from "@/lib/website-seo/content-blocks/types";

interface StatePayload {
  configured: boolean;
  blocks: WebsiteContentBlock[];
  updatedAt: string | null;
}

interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

interface CreateForm {
  name: string;
  category: WebsiteContentBlockCategory;
  scope: WebsiteContentBlockScope;
  placement: WebsiteContentBlockPlacement;
}

const EMPTY_CREATE: CreateForm = {
  name: "",
  category: "INFORMATION",
  scope: "HOMEPAGE",
  placement:
    "AFTER_PRIMARY_CONTENT",
};

function statusClass(
  status: WebsiteContentBlockStatus
): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    case "INACTIVE":
      return "bg-blue-50 text-blue-700";
    case "ARCHIVED":
      return "bg-zinc-200 text-zinc-600";
  }
}

function StatusPill({
  status,
}: {
  status: WebsiteContentBlockStatus;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(
        status
      )}`}
    >
      {status}
    </span>
  );
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

async function parseApi<T>(
  response: Response
): Promise<ApiEnvelope<T>> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return {
      ok: false,
      error:
        "Server returned an invalid response.",
    };
  }
}

export default function ContentBlocksManagerClient() {
  const [blocks, setBlocks] =
    useState<WebsiteContentBlock[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [draft, setDraft] =
    useState<WebsiteContentBlock | null>(
      null
    );

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [categoryFilter, setCategoryFilter] =
    useState("ALL");

  const [showCreate, setShowCreate] =
    useState(false);

  const [createForm, setCreateForm] =
    useState<CreateForm>(
      EMPTY_CREATE
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [archiving, setArchiving] =
    useState(false);

  const [moving, setMoving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadBlocks = useCallback(
    async (
      preferredId?: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/website-seo/content-blocks",
            {
              cache: "no-store",
            }
          );

        const payload =
          await parseApi<StatePayload>(
            response
          );

        if (
          !response.ok ||
          !payload.ok ||
          !payload.data
        ) {
          throw new Error(
            payload.error ??
              "Unable to load content blocks."
          );
        }

        const rows =
          payload.data.blocks;

        setBlocks(rows);

        setSelectedId(
          (current) => {
            if (
              preferredId &&
              rows.some(
                (block) =>
                  block.id ===
                  preferredId
              )
            ) {
              return preferredId;
            }

            if (
              current &&
              rows.some(
                (block) =>
                  block.id ===
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
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load content blocks."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  const selected =
    useMemo(
      () =>
        blocks.find(
          (block) =>
            block.id ===
            selectedId
        ) ?? null,
      [
        blocks,
        selectedId,
      ]
    );

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft({
      ...selected,
      content: {
        ...selected.content,
      },
    });

    setMessage(null);
  }, [selected]);

  const filteredBlocks =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return blocks.filter(
        (block) => {
          if (
            statusFilter !==
              "ALL" &&
            block.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            categoryFilter !==
              "ALL" &&
            block.category !==
              categoryFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            block.name,
            block.key,
            block.category,
            block.scope,
            block.placement,
            block.content.heading,
            block.content.body,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      blocks,
      search,
      statusFilter,
      categoryFilter,
    ]);

  const counts = useMemo(
    () => ({
      total: blocks.length,

      active:
        blocks.filter(
          (block) =>
            block.status ===
            "ACTIVE"
        ).length,

      draft:
        blocks.filter(
          (block) =>
            block.status ===
            "DRAFT"
        ).length,

      archived:
        blocks.filter(
          (block) =>
            block.status ===
            "ARCHIVED"
        ).length,
    }),
    [blocks]
  );

  async function createBlock() {
    if (!createForm.name.trim()) {
      setError(
        "Content block name is required."
      );

      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/website-seo/content-blocks",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                createForm.name.trim(),

              category:
                createForm.category,

              scope:
                createForm.scope,

              placement:
                createForm.placement,

              status: "DRAFT",

              content: {
                ...EMPTY_WEBSITE_CONTENT_BLOCK_CONTENT,
              },
            }),
          }
        );

      const payload =
        await parseApi<WebsiteContentBlock>(
          response
        );

      if (
        !response.ok ||
        !payload.ok ||
        !payload.data
      ) {
        throw new Error(
          payload.error ??
            "Unable to create content block."
        );
      }

      setCreateForm(
        EMPTY_CREATE
      );

      setShowCreate(false);

      setMessage(
        "Draft content block created."
      );

      await loadBlocks(
        payload.data.id
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create content block."
      );
    } finally {
      setCreating(false);
    }
  }

  async function saveBlock() {
    if (!draft) {
      return;
    }

    if (
      !draft.name.trim() ||
      !draft.key.trim()
    ) {
      setError(
        "Name and key are required."
      );

      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/website-seo/content-blocks/${draft.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                draft.name.trim(),

              key:
                draft.key.trim(),

              status:
                draft.status,

              category:
                draft.category,

              scope:
                draft.scope,

              placement:
                draft.placement,

              order:
                draft.order,

              content:
                draft.content,
            }),
          }
        );

      const payload =
        await parseApi<WebsiteContentBlock>(
          response
        );

      if (
        !response.ok ||
        !payload.ok ||
        !payload.data
      ) {
        throw new Error(
          payload.error ??
            "Unable to save content block."
        );
      }

      setMessage(
        "Content block saved successfully."
      );

      await loadBlocks(
        draft.id
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save content block."
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveBlock() {
    if (!draft) {
      return;
    }

    if (
      !window.confirm(
        "Archive this content block?"
      )
    ) {
      return;
    }

    setArchiving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/website-seo/content-blocks/${draft.id}`,
          {
            method: "DELETE",
          }
        );

      const payload =
        await parseApi<{
          id: string;
          archived: boolean;
          status: string;
        }>(response);

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ??
            "Unable to archive content block."
        );
      }

      setMessage(
        "Content block archived."
      );

      await loadBlocks(
        draft.id
      );
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive content block."
      );
    } finally {
      setArchiving(false);
    }
  }

  async function moveBlock(
    direction: -1 | 1
  ) {
    if (!draft) {
      return;
    }

    const ordered =
      blocks
        .filter(
          (block) =>
            block.status !==
            "ARCHIVED"
        )
        .sort(
          (a, b) =>
            a.order -
            b.order
        );

    const index =
      ordered.findIndex(
        (block) =>
          block.id ===
          draft.id
      );

    const targetIndex =
      index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >=
        ordered.length
    ) {
      return;
    }

    const target =
      ordered[targetIndex];

    setMoving(true);
    setError(null);
    setMessage(null);

    try {
      const first =
        await fetch(
          `/api/website-seo/content-blocks/${draft.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              order:
                target.order,
            }),
          }
        );

      const firstPayload =
        await parseApi<WebsiteContentBlock>(
          first
        );

      if (
        !first.ok ||
        !firstPayload.ok
      ) {
        throw new Error(
          firstPayload.error ??
            "Unable to reorder content block."
        );
      }

      const second =
        await fetch(
          `/api/website-seo/content-blocks/${target.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              order:
                draft.order,
            }),
          }
        );

      const secondPayload =
        await parseApi<WebsiteContentBlock>(
          second
        );

      if (
        !second.ok ||
        !secondPayload.ok
      ) {
        throw new Error(
          secondPayload.error ??
            "Unable to complete content block reorder."
        );
      }

      setMessage(
        "Content block order updated."
      );

      await loadBlocks(
        draft.id
      );
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Unable to reorder content block."
      );
    } finally {
      setMoving(false);
    }
  }

  function updateDraft<
    K extends keyof WebsiteContentBlock
  >(
    key: K,
    value: WebsiteContentBlock[K]
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  }

  function updateContent(
    key:
      keyof WebsiteContentBlock["content"],
    value: string
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,

            content: {
              ...current.content,
              [key]: value,
            },
          }
        : current
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-8 lg:px-8">
        <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager · Content Blocks"
            title="Reusable Content Blocks"
            description="Manage reusable public-site content without changing the W5 AI Content Engine or generated page content."
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void loadBlocks()
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

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500"
                >
                  <Plus size={16} />
                  New Block
                </button>
              </div>
            }
          />

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [
                "Total Blocks",
                counts.total,
              ],
              [
                "Active",
                counts.active,
              ],
              [
                "Draft",
                counts.draft,
              ],
              [
                "Archived",
                counts.archived,
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

          {showCreate ? (
            <WebsiteSeoCard className="mb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    New Content Block
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    Create reusable draft
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <input
                  value={
                    createForm.name
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Content block name"
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                />

                <select
                  value={
                    createForm.category
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        category:
                          event.target
                            .value as WebsiteContentBlockCategory,
                      })
                    )
                  }
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                >
                  {WEBSITE_CONTENT_BLOCK_CATEGORIES.map(
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

                <select
                  value={
                    createForm.scope
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        scope:
                          event.target
                            .value as WebsiteContentBlockScope,
                      })
                    )
                  }
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                >
                  {WEBSITE_CONTENT_BLOCK_SCOPES.map(
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

                <select
                  value={
                    createForm.placement
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        placement:
                          event.target
                            .value as WebsiteContentBlockPlacement,
                      })
                    )
                  }
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                >
                  {WEBSITE_CONTENT_BLOCK_PLACEMENTS.map(
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

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    void createBlock()
                  }
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={16} />
                  )}

                  Create Draft
                </button>
              </div>
            </WebsiteSeoCard>
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
                  placeholder="Search blocks..."
                  className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-red-400"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-bold"
              >
                <option value="ALL">
                  All Statuses
                </option>

                {WEBSITE_CONTENT_BLOCK_STATUSES.map(
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

              <select
                value={
                  categoryFilter
                }
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-bold"
              >
                <option value="ALL">
                  All Categories
                </option>

                {WEBSITE_CONTENT_BLOCK_CATEGORIES.map(
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
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Block Inventory
                </div>

                <h2 className="mt-2 text-xl font-black text-zinc-950">
                  {
                    filteredBlocks.length
                  }{" "}
                  blocks
                </h2>
              </div>

              <div className="mt-5 max-h-[760px] overflow-y-auto rounded-xl border border-zinc-200">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-red-600" />
                  </div>
                ) : filteredBlocks.length ===
                  0 ? (
                  <div className="py-16 text-center text-sm font-bold text-zinc-500">
                    No content blocks found.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {filteredBlocks
                      .sort(
                        (a, b) =>
                          a.order -
                          b.order
                      )
                      .map(
                        (block) => (
                          <button
                            key={
                              block.id
                            }
                            type="button"
                            onClick={() =>
                              setSelectedId(
                                block.id
                              )
                            }
                            className={`block w-full px-4 py-4 text-left ${
                              selectedId ===
                              block.id
                                ? "bg-red-50"
                                : "hover:bg-zinc-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-black text-zinc-950">
                                  {
                                    block.name
                                  }
                                </div>

                                <div className="mt-1 text-xs font-bold text-zinc-500">
                                  #
                                  {block.order +
                                    1}
                                  {" · "}
                                  {labelize(
                                    block.category
                                  )}
                                </div>

                                <div className="mt-1 truncate text-[11px] text-zinc-400">
                                  {labelize(
                                    block.scope
                                  )}
                                  {" · "}
                                  {labelize(
                                    block.placement
                                  )}
                                </div>
                              </div>

                              <StatusPill
                                status={
                                  block.status
                                }
                              />
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
                {!draft ? (
                  <div className="py-20 text-center">
                    <FileText
                      size={34}
                      className="mx-auto text-zinc-300"
                    />

                    <div className="mt-3 font-black text-zinc-800">
                      Select a content block
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 border-b border-zinc-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                          Content Block
                        </div>

                        <h2 className="mt-2 text-xl font-black text-zinc-950">
                          {draft.name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void moveBlock(
                              -1
                            )
                          }
                          disabled={
                            moving ||
                            draft.status ===
                              "ARCHIVED"
                          }
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 disabled:opacity-30"
                        >
                          <ArrowUp
                            size={15}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void moveBlock(
                              1
                            )
                          }
                          disabled={
                            moving ||
                            draft.status ===
                              "ARCHIVED"
                          }
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 disabled:opacity-30"
                        >
                          <ArrowDown
                            size={15}
                          />
                        </button>

                        <StatusPill
                          status={
                            draft.status
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Name
                        </div>

                        <input
                          value={
                            draft.name
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "name",
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Key
                        </div>

                        <input
                          value={
                            draft.key
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "key",
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Status
                        </div>

                        <select
                          value={
                            draft.status
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "status",
                              event.target
                                .value as WebsiteContentBlockStatus
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                        >
                          {WEBSITE_CONTENT_BLOCK_STATUSES.map(
                            (
                              value
                            ) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {labelize(
                                  value
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Category
                        </div>

                        <select
                          value={
                            draft.category
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "category",
                              event.target
                                .value as WebsiteContentBlockCategory
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                        >
                          {WEBSITE_CONTENT_BLOCK_CATEGORIES.map(
                            (
                              value
                            ) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {labelize(
                                  value
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Scope
                        </div>

                        <select
                          value={
                            draft.scope
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "scope",
                              event.target
                                .value as WebsiteContentBlockScope
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                        >
                          {WEBSITE_CONTENT_BLOCK_SCOPES.map(
                            (
                              value
                            ) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {labelize(
                                  value
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Placement
                        </div>

                        <select
                          value={
                            draft.placement
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "placement",
                              event.target
                                .value as WebsiteContentBlockPlacement
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                        >
                          {WEBSITE_CONTENT_BLOCK_PLACEMENTS.map(
                            (
                              value
                            ) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {labelize(
                                  value
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    </div>

                    <div className="mt-6 border-t border-zinc-100 pt-5">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                        Block Content
                      </div>

                      <div className="mt-4 grid gap-4">
                        <input
                          value={
                            draft.content
                              .eyebrow
                          }
                          onChange={(
                            event
                          ) =>
                            updateContent(
                              "eyebrow",
                              event.target
                                .value
                            )
                          }
                          placeholder="Eyebrow / small label"
                          className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />

                        <input
                          value={
                            draft.content
                              .heading
                          }
                          onChange={(
                            event
                          ) =>
                            updateContent(
                              "heading",
                              event.target
                                .value
                            )
                          }
                          placeholder="Heading"
                          className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />

                        <textarea
                          value={
                            draft.content
                              .body
                          }
                          onChange={(
                            event
                          ) =>
                            updateContent(
                              "body",
                              event.target
                                .value
                            )
                          }
                          rows={5}
                          placeholder="Reusable block content"
                          className="resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />

                        <div className="grid gap-3 lg:grid-cols-2">
                          <input
                            value={
                              draft.content
                                .ctaLabel
                            }
                            onChange={(
                              event
                            ) =>
                              updateContent(
                                "ctaLabel",
                                event.target
                                  .value
                              )
                            }
                            placeholder="CTA label"
                            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                          />

                          <input
                            value={
                              draft.content
                                .ctaHref
                            }
                            onChange={(
                              event
                            ) =>
                              updateContent(
                                "ctaHref",
                                event.target
                                  .value
                              )
                            }
                            placeholder="CTA URL"
                            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          void archiveBlock()
                        }
                        disabled={
                          archiving ||
                          draft.status ===
                            "ARCHIVED"
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-40"
                      >
                        {archiving ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Archive
                            size={16}
                          />
                        )}

                        Archive
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void saveBlock()
                        }
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Save
                            size={16}
                          />
                        )}

                        Save Block
                      </button>
                    </div>
                  </>
                )}
              </WebsiteSeoCard>

              {draft ? (
                <div className="overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
                    <Eye size={15} />
                    Block Preview
                  </div>

                  <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-6">
                    {draft.content
                      .eyebrow ? (
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                        {
                          draft.content
                            .eyebrow
                        }
                      </div>
                    ) : null}

                    <h3 className="mt-2 text-2xl font-black">
                      {draft.content
                        .heading ||
                        draft.name}
                    </h3>

                    {draft.content
                      .body ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
                        {
                          draft.content
                            .body
                        }
                      </p>
                    ) : null}

                    {draft.content
                      .ctaLabel ? (
                      <div className="mt-5 inline-flex rounded-lg bg-red-600 px-4 py-2.5 text-xs font-black">
                        {
                          draft.content
                            .ctaLabel
                        }
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                      <div className="font-black uppercase text-zinc-500">
                        Scope
                      </div>

                      <div className="mt-1 font-bold">
                        {labelize(
                          draft.scope
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                      <div className="font-black uppercase text-zinc-500">
                        Placement
                      </div>

                      <div className="mt-1 font-bold">
                        {labelize(
                          draft.placement
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}