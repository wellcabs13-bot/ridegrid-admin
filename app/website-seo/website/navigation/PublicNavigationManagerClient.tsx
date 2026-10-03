"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
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
  WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES,
  WEBSITE_PUBLIC_NAVIGATION_LOCATIONS,
  type WebsitePublicNavigationItem,
  type WebsitePublicNavigationLinkType,
  type WebsitePublicNavigationLocation,
  type WebsitePublicNavigationState,
} from "@/lib/website-seo/public-navigation/types";

interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

interface CreateForm {
  label: string;
  href: string;
  location: WebsitePublicNavigationLocation;
  linkType: WebsitePublicNavigationLinkType;
}

const EMPTY_CREATE: CreateForm = {
  label: "",
  href: "/",
  location: "HEADER",
  linkType: "INTERNAL",
};

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

export default function PublicNavigationManagerClient() {
  const [items, setItems] =
    useState<WebsitePublicNavigationItem[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [draft, setDraft] =
    useState<WebsitePublicNavigationItem | null>(
      null
    );

  const [search, setSearch] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("ALL");

  const [enabledFilter, setEnabledFilter] =
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

  const [deleting, setDeleting] =
    useState(false);

  const [moving, setMoving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadItems =
    useCallback(
      async (
        preferredId?: string
      ) => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/website-seo/public-navigation",
              {
                cache: "no-store",
              }
            );

          const payload =
            await parseApi<WebsitePublicNavigationState>(
              response
            );

          if (
            !response.ok ||
            !payload.ok ||
            !payload.data
          ) {
            throw new Error(
              payload.error ??
                "Unable to load navigation."
            );
          }

          const rows =
            payload.data.items;

          setItems(rows);

          setSelectedId(
            (current) => {
              if (
                preferredId &&
                rows.some(
                  (item) =>
                    item.id ===
                    preferredId
                )
              ) {
                return preferredId;
              }

              if (
                current &&
                rows.some(
                  (item) =>
                    item.id ===
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
              : "Unable to load navigation."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const selected =
    useMemo(
      () =>
        items.find(
          (item) =>
            item.id ===
            selectedId
        ) ?? null,
      [
        items,
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
    });
  }, [selected]);

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          if (
            locationFilter !==
              "ALL" &&
            item.location !==
              locationFilter
          ) {
            return false;
          }

          if (
            enabledFilter ===
              "ENABLED" &&
            !item.enabled
          ) {
            return false;
          }

          if (
            enabledFilter ===
              "DISABLED" &&
            item.enabled
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            item.label,
            item.href,
            item.location,
            item.linkType,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      items,
      search,
      locationFilter,
      enabledFilter,
    ]);

  const counts = useMemo(
    () => ({
      total:
        items.length,

      enabled:
        items.filter(
          (item) =>
            item.enabled
        ).length,

      header:
        items.filter(
          (item) =>
            item.location ===
            "HEADER"
        ).length,

      footer:
        items.filter(
          (item) =>
            item.location !==
            "HEADER"
        ).length,
    }),
    [items]
  );

  const siblings =
    useMemo(
      () =>
        draft
          ? items
              .filter(
                (item) =>
                  item.location ===
                  draft.location
              )
              .sort(
                (a, b) =>
                  a.order -
                  b.order
              )
          : [],
      [
        items,
        draft,
      ]
    );

  function updateDraft<
    K extends keyof WebsitePublicNavigationItem
  >(
    key: K,
    value: WebsitePublicNavigationItem[K]
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

  async function createItem() {
    if (
      !createForm.label.trim() ||
      !createForm.href.trim()
    ) {
      setError(
        "Label and URL are required."
      );

      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/website-seo/public-navigation",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                label:
                  createForm.label.trim(),

                href:
                  createForm.href.trim(),

                location:
                  createForm.location,

                linkType:
                  createForm.linkType,

                enabled: true,

                openInNewTab:
                  createForm.linkType ===
                  "EXTERNAL",
              }),
          }
        );

      const payload =
        await parseApi<WebsitePublicNavigationItem>(
          response
        );

      if (
        !response.ok ||
        !payload.ok ||
        !payload.data
      ) {
        throw new Error(
          payload.error ??
            "Unable to create navigation item."
        );
      }

      setCreateForm(
        EMPTY_CREATE
      );

      setShowCreate(false);

      await loadItems(
        payload.data.id
      );

      setMessage(
        "Navigation item created."
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create navigation item."
      );
    } finally {
      setCreating(false);
    }
  }

  async function saveItem() {
    if (!draft) {
      return;
    }

    if (
      !draft.label.trim() ||
      !draft.href.trim()
    ) {
      setError(
        "Label and URL are required."
      );

      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/website-seo/public-navigation/${draft.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                label:
                  draft.label.trim(),

                href:
                  draft.href.trim(),

                location:
                  draft.location,

                linkType:
                  draft.linkType,

                enabled:
                  draft.enabled,

                openInNewTab:
                  draft.openInNewTab,

                order:
                  draft.order,
              }),
          }
        );

      const payload =
        await parseApi<WebsitePublicNavigationItem>(
          response
        );

      if (
        !response.ok ||
        !payload.ok ||
        !payload.data
      ) {
        throw new Error(
          payload.error ??
            "Unable to save navigation item."
        );
      }

      await loadItems(
        draft.id
      );

      setMessage(
        "Navigation item saved."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save navigation item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveItem(
    direction: -1 | 1
  ) {
    if (!draft) {
      return;
    }

    const target =
      draft.order +
      direction;

    if (
      target < 0 ||
      target >= siblings.length
    ) {
      return;
    }

    setMoving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/website-seo/public-navigation/${draft.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                order:
                  target,
              }),
          }
        );

      const payload =
        await parseApi<WebsitePublicNavigationItem>(
          response
        );

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ??
            "Unable to reorder navigation."
        );
      }

      await loadItems(
        draft.id
      );

      setMessage(
        "Navigation order updated."
      );
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Unable to reorder navigation."
      );
    } finally {
      setMoving(false);
    }
  }

  async function deleteItem() {
    if (!draft) {
      return;
    }

    if (
      !window.confirm(
        "Delete this public navigation item?"
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/website-seo/public-navigation/${draft.id}`,
          {
            method: "DELETE",
          }
        );

      const payload =
        await parseApi<{
          id: string;
          deleted: boolean;
        }>(response);

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ??
            "Unable to delete navigation item."
        );
      }

      setSelectedId(null);

      await loadItems();

      setMessage(
        "Navigation item deleted."
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete navigation item."
      );
    } finally {
      setDeleting(false);
    }
  }

  const enabledHeader =
    items
      .filter(
        (item) =>
          item.location ===
            "HEADER" &&
          item.enabled
      )
      .sort(
        (a, b) =>
          a.order -
          b.order
      );

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-8 lg:px-8">
        <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager · Navigation"
            title="Public Website Navigation"
            description="Manage future RideGrid public website header and footer links without changing the Admin Dashboard navigation."
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void loadItems()
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
                  Add Link
                </button>
              </div>
            }
          />

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [
                "Total Links",
                counts.total,
              ],
              [
                "Enabled",
                counts.enabled,
              ],
              [
                "Header",
                counts.header,
              ],
              [
                "Footer",
                counts.footer,
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
              <CheckCircle2 size={16} />
              {message}
            </div>
          ) : null}

          {showCreate ? (
            <WebsiteSeoCard className="mb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    New Navigation Link
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    Add public-site link
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
                    createForm.label
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        label:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Link label"
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                />

                <input
                  value={
                    createForm.href
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        href:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="/routes or https://..."
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                />

                <select
                  value={
                    createForm.location
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        location:
                          event.target.value as WebsitePublicNavigationLocation,
                      })
                    )
                  }
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                >
                  {WEBSITE_PUBLIC_NAVIGATION_LOCATIONS.map(
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
                    createForm.linkType
                  }
                  onChange={(event) => {
                    const value =
                      event.target.value as WebsitePublicNavigationLinkType;

                    setCreateForm(
                      (current) => ({
                        ...current,
                        linkType:
                          value,
                        href:
                          value ===
                          "INTERNAL"
                            ? "/"
                            : "https://",
                      })
                    );
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                >
                  {WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES.map(
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
                    void createItem()
                  }
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create Link
                </button>
              </div>
            </WebsiteSeoCard>
          ) : null}

          <WebsiteSeoCard>
            <div className="grid gap-3 lg:grid-cols-[1fr_210px_180px]">
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
                  placeholder="Search links..."
                  className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-red-400"
                />
              </label>

              <select
                value={
                  locationFilter
                }
                onChange={(event) =>
                  setLocationFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-bold"
              >
                <option value="ALL">
                  All Locations
                </option>

                {WEBSITE_PUBLIC_NAVIGATION_LOCATIONS.map(
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
                  enabledFilter
                }
                onChange={(event) =>
                  setEnabledFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-bold"
              >
                <option value="ALL">
                  All States
                </option>
                <option value="ENABLED">
                  Enabled
                </option>
                <option value="DISABLED">
                  Disabled
                </option>
              </select>
            </div>
          </WebsiteSeoCard>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(300px,.65fr)_minmax(0,1.35fr)]">
            <WebsiteSeoCard>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                Navigation Inventory
              </div>

              <h2 className="mt-2 text-xl font-black text-zinc-950">
                {
                  filteredItems.length
                }{" "}
                links
              </h2>

              <div className="mt-5 max-h-[720px] overflow-y-auto rounded-xl border border-zinc-200">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-red-600" />
                  </div>
                ) : filteredItems.length ===
                  0 ? (
                  <div className="py-16 text-center text-sm font-bold text-zinc-500">
                    No navigation links found.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {filteredItems.map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setSelectedId(
                              item.id
                            )
                          }
                          className={`block w-full px-4 py-4 text-left ${
                            selectedId ===
                            item.id
                              ? "bg-red-50"
                              : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-black text-zinc-950">
                                {
                                  item.label
                                }
                              </div>

                              <div className="mt-1 truncate text-xs font-bold text-zinc-500">
                                {labelize(
                                  item.location
                                )}
                                {" · #"}
                                {item.order +
                                  1}
                              </div>

                              <div className="mt-1 truncate text-[11px] text-zinc-400">
                                {item.href}
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                                item.enabled
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {item.enabled
                                ? "Enabled"
                                : "Disabled"}
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
                {!draft ? (
                  <div className="py-20 text-center">
                    <Menu
                      size={34}
                      className="mx-auto text-zinc-300"
                    />

                    <div className="mt-3 font-black text-zinc-800">
                      Select a navigation link
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                          Link Configuration
                        </div>

                        <h2 className="mt-2 text-xl font-black text-zinc-950">
                          {draft.label}
                        </h2>
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void moveItem(
                              -1
                            )
                          }
                          disabled={
                            moving ||
                            draft.order ===
                              0
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
                            void moveItem(
                              1
                            )
                          }
                          disabled={
                            moving ||
                            draft.order >=
                              siblings.length -
                                1
                          }
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 disabled:opacity-30"
                        >
                          <ArrowDown
                            size={15}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Label
                        </div>

                        <input
                          value={
                            draft.label
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "label",
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          URL
                        </div>

                        <input
                          value={
                            draft.href
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "href",
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                        />
                      </label>

                      <label>
                        <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Location
                        </div>

                        <select
                          value={
                            draft.location
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "location",
                              event.target
                                .value as WebsitePublicNavigationLocation
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                        >
                          {WEBSITE_PUBLIC_NAVIGATION_LOCATIONS.map(
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
                          Link Type
                        </div>

                        <select
                          value={
                            draft.linkType
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "linkType",
                              event.target
                                .value as WebsitePublicNavigationLinkType
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold"
                        >
                          {WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES.map(
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

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4">
                        <input
                          type="checkbox"
                          checked={
                            draft.enabled
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "enabled",
                              event.target
                                .checked
                            )
                          }
                          className="h-4 w-4 accent-red-600"
                        />

                        <span className="text-sm font-black text-zinc-800">
                          Enabled
                        </span>
                      </label>

                      <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4">
                        <input
                          type="checkbox"
                          checked={
                            draft.openInNewTab
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "openInNewTab",
                              event.target
                                .checked
                            )
                          }
                          className="h-4 w-4 accent-red-600"
                        />

                        <span className="text-sm font-black text-zinc-800">
                          Open in new tab
                        </span>
                      </label>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          void deleteItem()
                        }
                        disabled={deleting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-40"
                      >
                        {deleting ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={16}
                          />
                        )}
                        Delete
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void saveItem()
                        }
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
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
                        Save Link
                      </button>
                    </div>
                  </>
                )}
              </WebsiteSeoCard>

              <div className="overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
                  <Link2 size={15} />
                  Header Preview
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-5">
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="mr-auto text-lg font-black">
                      RIDEGRID
                    </div>

                    {enabledHeader.length ===
                    0 ? (
                      <div className="text-xs font-bold text-zinc-500">
                        No enabled header links
                      </div>
                    ) : (
                      enabledHeader.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            className="flex items-center gap-1 text-xs font-black text-zinc-300"
                          >
                            {
                              item.label
                            }

                            {item.linkType ===
                            "EXTERNAL" ? (
                              <ExternalLink
                                size={11}
                              />
                            ) : null}
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    "FOOTER_PRIMARY",
                    "FOOTER_SECONDARY",
                    "FOOTER_LEGAL",
                  ].map(
                    (location) => {
                      const rows =
                        items
                          .filter(
                            (item) =>
                              item.location ===
                                location &&
                              item.enabled
                          )
                          .sort(
                            (a, b) =>
                              a.order -
                              b.order
                          );

                      return (
                        <div
                          key={
                            location
                          }
                          className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                        >
                          <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                            {labelize(
                              location
                            )}
                          </div>

                          <div className="mt-3 space-y-2">
                            {rows.length ===
                            0 ? (
                              <div className="text-xs text-zinc-600">
                                No links
                              </div>
                            ) : (
                              rows.map(
                                (item) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="text-xs font-bold text-zinc-300"
                                  >
                                    {
                                      item.label
                                    }
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}