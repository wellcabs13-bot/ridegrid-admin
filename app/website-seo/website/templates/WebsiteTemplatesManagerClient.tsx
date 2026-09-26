"use client";

import Link from "next/link";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileStack,
  Filter,
  LayoutTemplate,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
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

type RecordValue = Record<string, unknown>;

const TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

type TemplateStatus =
  (typeof TEMPLATE_STATUSES)[number];

const ENTITY_TYPES = [
  "ROUTE",
  "CITY",
  "SERVICE",
  "AIRPORT",
  "AREA",
  "VEHICLE",
] as const;

type EntityType =
  (typeof ENTITY_TYPES)[number];

const SECTION_TYPES = [
  "HERO",
  "SEARCH",
  "OVERVIEW",
  "MARKETPLACE",
  "PRICING",
  "VEHICLES",
  "ROUTES",
  "SERVICES",
  "AIRPORTS",
  "AREAS",
  "FAQ",
  "REVIEWS",
  "TRUST",
  "CONTENT",
  "CTA",
  "RELATED",
] as const;

type SectionType =
  (typeof SECTION_TYPES)[number];

interface TemplateSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  variant?: string | null;
  settings?: Record<string, unknown> | null;
}

interface CreateForm {
  name: string;
  key: string;
  entityType: EntityType;
  pathPattern: string;
}

const EMPTY_CREATE: CreateForm = {
  name: "",
  key: "",
  entityType: "ROUTE",
  pathPattern: "/routes/{slug}",
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

function extractData(payload: unknown): RecordValue | null {
  if (!isRecord(payload)) {
    return null;
  }

  return isRecord(payload.data)
    ? payload.data
    : null;
}

function extractError(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  return typeof payload.error === "string"
    ? payload.error
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

function templateSections(
  template: RecordValue
): TemplateSection[] {
  const raw = template.sections;

  if (!Array.isArray(raw)) {
    return [];
  }

  const sections: TemplateSection[] = [];

  raw.forEach((value, index) => {
    if (!isRecord(value)) {
      return;
    }

    const rawType =
      readString(value, "type");

    if (
      !rawType ||
      !(SECTION_TYPES as readonly string[]).includes(
        rawType
      )
    ) {
      return;
    }

    const settingsValue =
      value.settings;

    sections.push({
      id:
        readString(value, "id") ??
        `${rawType.toLowerCase()}-${index}`,
      type: rawType as SectionType,
      enabled:
        typeof value.enabled === "boolean"
          ? value.enabled
          : true,
      order:
        typeof value.order === "number"
          ? value.order
          : index,
      variant:
        typeof value.variant === "string"
          ? value.variant
          : null,
      settings:
        isRecord(settingsValue)
          ? settingsValue
          : null,
    });
  });

  return sections.sort(
    (a, b) => a.order - b.order
  );
}
function statusTone(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    case "INACTIVE":
      return "bg-blue-50 text-blue-700";
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
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(
        status
      )}`}
    >
      {status}
    </span>
  );
}

export default function WebsiteTemplatesManagerClient() {
  const [templates, setTemplates] =
    useState<RecordValue[]>([]);

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

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [bootstrapping, setBootstrapping] =
    useState(false);

  const [showCreate, setShowCreate] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editKey, setEditKey] =
    useState("");

  const [editPath, setEditPath] =
    useState("");

  const [editStatus, setEditStatus] =
    useState<TemplateStatus>("DRAFT");

  const [editSections, setEditSections] =
    useState<TemplateSection[]>([]);

  const [createForm, setCreateForm] =
    useState<CreateForm>(EMPTY_CREATE);

  const loadData = useCallback(
    async (preferredId?: string) => {
      setLoading(true);
      setError(null);

      try {
        const [
          templatesResponse,
          pagesResponse,
        ] = await Promise.all([
          fetch(
            "/api/website-seo/templates",
            { cache: "no-store" }
          ),
          fetch(
            "/api/website-seo/pages",
            { cache: "no-store" }
          ),
        ]);

        const [
          templatesPayload,
          pagesPayload,
        ] = await Promise.all([
          safeJson(templatesResponse),
          safeJson(pagesResponse),
        ]);

        if (!templatesResponse.ok) {
          throw new Error(
            extractError(
              templatesPayload
            ) ??
              "Unable to load templates."
          );
        }

        if (!pagesResponse.ok) {
          throw new Error(
            extractError(pagesPayload) ??
              "Unable to load generated pages."
          );
        }

        const templateRows =
          extractList(templatesPayload);

        setTemplates(templateRows);
        setPages(extractList(pagesPayload));

        setSelectedId((current) => {
          if (
            preferredId &&
            templateRows.some(
              (row) =>
                readString(row, "id") ===
                preferredId
            )
          ) {
            return preferredId;
          }

          if (
            current &&
            templateRows.some(
              (row) =>
                readString(row, "id") ===
                current
            )
          ) {
            return current;
          }

          return templateRows.length > 0
            ? readString(
                templateRows[0],
                "id"
              ) ?? null
            : null;
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load template manager."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          readString(
            template,
            "id"
          ) === selectedId
      ) ?? null,
    [templates, selectedId]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setEditName(
      readString(
        selectedTemplate,
        "name"
      ) ?? ""
    );

    setEditKey(
      readString(
        selectedTemplate,
        "key"
      ) ?? ""
    );

    setEditPath(
      readString(
        selectedTemplate,
        "pathPattern"
      ) ?? ""
    );

    const status =
      readString(
        selectedTemplate,
        "status"
      );

    setEditStatus(
      TEMPLATE_STATUSES.includes(
        status as TemplateStatus
      )
        ? (status as TemplateStatus)
        : "DRAFT"
    );

    setEditSections(
      templateSections(
        selectedTemplate
      )
    );

    setMessage(null);
    setError(null);
  }, [selectedTemplate]);

  const filteredTemplates =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return templates.filter(
        (template) => {
          const status =
            readString(
              template,
              "status"
            ) ?? "";

          const entityType =
            readString(
              template,
              "entityType"
            ) ?? "";

          if (
            statusFilter !== "ALL" &&
            status !== statusFilter
          ) {
            return false;
          }

          if (
            entityFilter !== "ALL" &&
            entityType !== entityFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            readString(
              template,
              "name"
            ) ?? "",
            readString(
              template,
              "key"
            ) ?? "",
            readString(
              template,
              "pathPattern"
            ) ?? "",
            entityType,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      templates,
      search,
      statusFilter,
      entityFilter,
    ]);

  const selectedUsageCount =
    useMemo(() => {
      if (!selectedId) {
        return 0;
      }

      return pages.filter(
        (page) =>
          readString(
            page,
            "templateId"
          ) === selectedId
      ).length;
    }, [pages, selectedId]);

  const counts = useMemo(
    () => ({
      total: templates.length,
      active: templates.filter(
        (template) =>
          readString(
            template,
            "status"
          ) === "ACTIVE"
      ).length,
      draft: templates.filter(
        (template) =>
          readString(
            template,
            "status"
          ) === "DRAFT"
      ).length,
      archived: templates.filter(
        (template) =>
          readString(
            template,
            "status"
          ) === "ARCHIVED"
      ).length,
    }),
    [templates]
  );

  function toggleSection(
    type: SectionType
  ) {
    setEditSections((current) => {
      const existing =
        current.find(
          (section) =>
            section.type === type
        );

      if (existing) {
        return current.map(
          (section) =>
            section.type === type
              ? {
                  ...section,
                  enabled:
                    !section.enabled,
                }
              : section
        );
      }

      return [
        ...current,
        {
          id: type.toLowerCase(),
          type,
          enabled: true,
          order: current.length,
          variant: null,
          settings: null,
        },
      ];
    });
  }

  function moveSection(
    type: SectionType,
    direction: -1 | 1
  ) {
    setEditSections((current) => {
      const sorted = [...current].sort(
        (a, b) =>
          a.order - b.order
      );

      const index =
        sorted.findIndex(
          (section) =>
            section.type === type
        );

      if (index < 0) {
        return current;
      }

      const target =
        index + direction;

      if (
        target < 0 ||
        target >= sorted.length
      ) {
        return current;
      }

      const copy = [...sorted];

      [copy[index], copy[target]] = [
        copy[target],
        copy[index],
      ];

      return copy.map(
        (section, order) => ({
          ...section,
          order,
        })
      );
    });
  }

  async function saveTemplate() {
    if (
      !selectedTemplate ||
      !selectedId
    ) {
      return;
    }

    if (
      !editName.trim() ||
      !editKey.trim() ||
      !editPath.trim()
    ) {
      setError(
        "Name, key and path pattern are required."
      );

      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/website-seo/templates/${selectedId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: editName.trim(),
            key: editKey.trim(),
            status: editStatus,
            pathPattern:
              editPath.trim(),
            sections: editSections.map(
              (
                section,
                index
              ) => ({
                ...section,
                order: index,
              })
            ),
          }),
        }
      );

      const payload =
        await safeJson(response);

      if (!response.ok) {
        throw new Error(
          extractError(payload) ??
            "Unable to update template."
        );
      }

      setMessage(
        "Template saved successfully."
      );

      await loadData(selectedId);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save template."
      );
    } finally {
      setSaving(false);
    }
  }

  async function createTemplate() {
    if (
      !createForm.name.trim() ||
      !createForm.pathPattern.trim()
    ) {
      setError(
        "Template name and path pattern are required."
      );

      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/website-seo/templates",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name:
              createForm.name.trim(),
            ...(createForm.key.trim()
              ? {
                  key:
                    createForm.key.trim(),
                }
              : {}),
            entityType:
              createForm.entityType,
            status: "DRAFT",
            pathPattern:
              createForm.pathPattern.trim(),
            sections: [],
          }),
        }
      );

      const payload =
        await safeJson(response);

      if (!response.ok) {
        throw new Error(
          extractError(payload) ??
            "Unable to create template."
        );
      }

      const created =
        extractData(payload);

      const id = created
        ? readString(
            created,
            "id"
          )
        : undefined;

      setCreateForm(EMPTY_CREATE);
      setShowCreate(false);

      setMessage(
        "Draft template created. Configure its sections before activation."
      );

      await loadData(id);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create template."
      );
    } finally {
      setCreating(false);
    }
  }

  async function bootstrapDefaults() {
    setBootstrapping(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/website-seo/templates/bootstrap",
        {
          method: "POST",
        }
      );

      const payload =
        await safeJson(response);

      if (!response.ok) {
        throw new Error(
          extractError(payload) ??
            "Unable to bootstrap default templates."
        );
      }

      setMessage(
        "Default Website SEO templates synchronized successfully."
      );

      await loadData();
    } catch (bootstrapError) {
      setError(
        bootstrapError instanceof Error
          ? bootstrapError.message
          : "Unable to bootstrap templates."
      );
    } finally {
      setBootstrapping(false);
    }
  }

  async function deleteTemplate() {
    if (
      !selectedTemplate ||
      !selectedId
    ) {
      return;
    }

    const status =
      readString(
        selectedTemplate,
        "status"
      );

    if (status === "ACTIVE") {
      setError(
        "Active templates cannot be deleted. Change status first."
      );

      return;
    }

    if (selectedUsageCount > 0) {
      setError(
        `This template is used by ${selectedUsageCount} generated page(s) and cannot be safely deleted.`
      );

      return;
    }

    if (
      !window.confirm(
        "Delete this unused template permanently?"
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/website-seo/templates/${selectedId}`,
        {
          method: "DELETE",
        }
      );

      const payload =
        await safeJson(response);

      if (!response.ok) {
        throw new Error(
          extractError(payload) ??
            "Unable to delete template."
        );
      }

      setSelectedId(null);

      setMessage(
        "Unused template deleted successfully."
      );

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete template."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-8 lg:px-8">
        <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager · Templates"
            title="Page Template Manager"
            description="Manage the real W3 template system used by routes, cities, services, airports, areas and vehicles."
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void bootstrapDefaults()
                  }
                  disabled={
                    bootstrapping
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-black text-white transition hover:border-red-500 disabled:opacity-50"
                >
                  {bootstrapping ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles
                      size={16}
                    />
                  )}

                  Sync Defaults
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500"
                >
                  <Plus size={16} />
                  New Template
                </button>
              </div>
            }
          />

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [
                "Total Templates",
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
            ].map(([label, value]) => (
              <div
                key={String(label)}
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

          {showCreate ? (
            <WebsiteSeoCard className="mb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    New Template
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    Create draft template
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
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
                  placeholder="Template name"
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                />

                <input
                  value={
                    createForm.key
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        key:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Template key (optional)"
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                />

                <select
                  value={
                    createForm.entityType
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        entityType:
                          event.target
                            .value as EntityType,
                      })
                    )
                  }
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold outline-none focus:border-red-400"
                >
                  {ENTITY_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

                <input
                  value={
                    createForm.pathPattern
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        pathPattern:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="/routes/{slug}"
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    void createTemplate()
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
                  placeholder="Search name, key or path..."
                  className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-red-400"
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
                  className="w-full rounded-xl border border-zinc-200 py-3 pl-9 pr-3 text-sm font-bold outline-none focus:border-red-400"
                >
                  <option value="ALL">
                    All Statuses
                  </option>

                  {TEMPLATE_STATUSES.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
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
                className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-bold outline-none focus:border-red-400"
              >
                <option value="ALL">
                  All Entity Types
                </option>

                {ENTITY_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>
          </WebsiteSeoCard>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
            <WebsiteSeoCard>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    Template Inventory
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    {filteredTemplates.length} templates
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadData()
                  }
                  disabled={loading}
                  className="rounded-xl border border-zinc-200 p-2.5 text-zinc-500 hover:bg-zinc-50"
                >
                  <RefreshCw
                    size={16}
                    className={
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>

              <div className="mt-5 max-h-[720px] overflow-y-auto rounded-xl border border-zinc-200">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2
                      className="animate-spin text-red-600"
                    />
                  </div>
                ) : filteredTemplates.length ===
                  0 ? (
                  <div className="py-16 text-center text-sm font-bold text-zinc-500">
                    No templates match the filters.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {filteredTemplates.map(
                      (template) => {
                        const id =
                          readString(
                            template,
                            "id"
                          ) ?? "";

                        const status =
                          readString(
                            template,
                            "status"
                          ) ?? "UNKNOWN";

                        const sections =
                          templateSections(
                            template
                          );

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
                              selectedId === id
                                ? "bg-red-50"
                                : "hover:bg-zinc-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-black text-zinc-950">
                                  {readString(
                                    template,
                                    "name"
                                  )}
                                </div>

                                <div className="mt-1 text-xs font-bold text-zinc-500">
                                  {readString(
                                    template,
                                    "entityType"
                                  )}
                                  {" · "}
                                  {
                                    sections.filter(
                                      (
                                        section
                                      ) =>
                                        section.enabled
                                    ).length
                                  }{" "}
                                  enabled sections
                                </div>

                                <div className="mt-1 truncate text-[11px] text-zinc-400">
                                  {readString(
                                    template,
                                    "pathPattern"
                                  )}
                                </div>
                              </div>

                              <StatusPill
                                status={
                                  status
                                }
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

            <WebsiteSeoCard>
              {!selectedTemplate ? (
                <div className="py-20 text-center">
                  <LayoutTemplate
                    size={34}
                    className="mx-auto text-zinc-300"
                  />

                  <div className="mt-3 font-black text-zinc-800">
                    Select a template
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                        Template Configuration
                      </div>

                      <h2 className="mt-2 text-xl font-black text-zinc-950">
                        {readString(
                          selectedTemplate,
                          "name"
                        )}
                      </h2>

                      <div className="mt-1 text-sm font-bold text-zinc-500">
                        {readString(
                          selectedTemplate,
                          "entityType"
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href="/website-seo/website/pages"
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                      >
                        <FileStack
                          size={14}
                        />
                        {selectedUsageCount}{" "}
                        Pages
                      </Link>

                      <StatusPill
                        status={
                          readString(
                            selectedTemplate,
                            "status"
                          ) ??
                          "UNKNOWN"
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <label>
                      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                        Template Name
                      </div>

                      <input
                        value={editName}
                        onChange={(
                          event
                        ) =>
                          setEditName(
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
                        value={editKey}
                        onChange={(
                          event
                        ) =>
                          setEditKey(
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                      />
                    </label>

                    <label>
                      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                        Path Pattern
                      </div>

                      <input
                        value={editPath}
                        onChange={(
                          event
                        ) =>
                          setEditPath(
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
                        value={editStatus}
                        onChange={(
                          event
                        ) =>
                          setEditStatus(
                            event.target
                              .value as TemplateStatus
                          )
                        }
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold outline-none focus:border-red-400"
                      >
                        {TEMPLATE_STATUSES.map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>

                  <div className="mt-6 border-t border-zinc-100 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
                          Section Configuration
                        </div>

                        <p className="mt-1 text-sm text-zinc-500">
                          Enable, disable and order W3 template sections.
                        </p>
                      </div>

                      <div className="text-xs font-black text-zinc-500">
                        {
                          editSections.filter(
                            (
                              section
                            ) =>
                              section.enabled
                          ).length
                        }{" "}
                        enabled
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {SECTION_TYPES.map(
                        (type) => {
                          const section =
                            editSections.find(
                              (
                                item
                              ) =>
                                item.type ===
                                type
                            );

                          const enabled =
                            section?.enabled ??
                            false;

                          const order =
                            section?.order;

                          return (
                            <div
                              key={type}
                              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                                enabled
                                  ? "border-red-200 bg-red-50"
                                  : "border-zinc-200 bg-white"
                              }`}
                            >
                              <label className="flex min-w-0 cursor-pointer items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    enabled
                                  }
                                  onChange={() =>
                                    toggleSection(
                                      type
                                    )
                                  }
                                  className="h-4 w-4 accent-red-600"
                                />

                                <span className="font-black text-zinc-800">
                                  {type}
                                </span>

                                {enabled &&
                                typeof order ===
                                  "number" ? (
                                  <span className="text-xs font-bold text-zinc-400">
                                    #
                                    {order +
                                      1}
                                  </span>
                                ) : null}
                              </label>

                              {section ? (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveSection(
                                        type,
                                        -1
                                      )
                                    }
                                    className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 hover:text-red-600"
                                  >
                                    <ArrowUp
                                      size={
                                        14
                                      }
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveSection(
                                        type,
                                        1
                                      )
                                    }
                                    className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 hover:text-red-600"
                                  >
                                    <ArrowDown
                                      size={
                                        14
                                      }
                                    />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        void deleteTemplate()
                      }
                      disabled={
                        deleting ||
                        selectedUsageCount >
                          0 ||
                        readString(
                          selectedTemplate,
                          "status"
                        ) === "ACTIVE"
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
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

                      Delete Template
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void saveTemplate()
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
                        <Save size={16} />
                      )}

                      Save Template
                    </button>
                  </div>

                  {selectedUsageCount >
                  0 ? (
                    <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                      Delete protected:
                      this template is
                      currently used by{" "}
                      {selectedUsageCount}{" "}
                      generated page(s).
                    </div>
                  ) : null}
                </>
              )}
            </WebsiteSeoCard>
          </div>
        </div>
      </section>
    </>
  );
}