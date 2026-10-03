"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  GripVertical,
  Home,
  Loader2,
  RefreshCw,
  Save,
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
  EMPTY_WEBSITE_HOMEPAGE_CONFIG,
  type WebsiteHomepageConfig,
  type WebsiteHomepageSection,
} from "@/lib/website-seo/homepage";

interface HomepageResponse {
  configured: boolean;
  config: WebsiteHomepageConfig | null;
  updatedAt: string | null;
}

function cloneEmptyConfig(): WebsiteHomepageConfig {
  return JSON.parse(
    JSON.stringify(
      EMPTY_WEBSITE_HOMEPAGE_CONFIG
    )
  ) as WebsiteHomepageConfig;
}

function sectionLabel(
  type: WebsiteHomepageSection["type"]
): string {
  const labels = {
    HERO: "Hero",
    SEARCH: "Marketplace Search",
    TRUST: "Trust & Benefits",
    ROUTES: "Popular Routes",
    MARKETPLACE: "Vehicles & Marketplace",
    CONTENT: "Homepage Content",
    REVIEWS: "Customer Reviews",
    CTA: "Conversion CTA",
  };

  return labels[type];
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "Not saved yet";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unavailable";
  }

  return date.toLocaleString();
}

export default function HomepageManagerClient() {
  const [config, setConfig] =
    useState<WebsiteHomepageConfig>(
      cloneEmptyConfig()
    );

  const [configured, setConfigured] =
    useState(false);

  const [updatedAt, setUpdatedAt] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadHomepage =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/website-seo/homepage",
          {
            cache: "no-store",
          }
        );

        const payload =
          (await response.json()) as {
            ok?: boolean;
            data?: HomepageResponse;
            error?: string;
          };

        if (
          !response.ok ||
          !payload.ok ||
          !payload.data
        ) {
          throw new Error(
            payload.error ??
              "Unable to load homepage."
          );
        }

        setConfigured(
          payload.data.configured
        );

        setUpdatedAt(
          payload.data.updatedAt
        );

        setConfig(
          payload.data.config
            ? payload.data.config
            : cloneEmptyConfig()
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load homepage."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadHomepage();
  }, [loadHomepage]);

  const enabledCount = useMemo(
    () =>
      config.sections.filter(
        (section) =>
          section.enabled
      ).length,
    [config.sections]
  );

  function updateHero(
    key: keyof WebsiteHomepageConfig["hero"],
    value: string
  ) {
    setConfig((current) => ({
      ...current,

      hero: {
        ...current.hero,
        [key]: value,
      },
    }));
  }

  function updateSection(
    type: WebsiteHomepageSection["type"],
    patch: Partial<WebsiteHomepageSection>
  ) {
    setConfig((current) => ({
      ...current,

      sections:
        current.sections.map(
          (section) =>
            section.type === type
              ? {
                  ...section,
                  ...patch,
                }
              : section
        ),
    }));
  }

  function moveSection(
    type: WebsiteHomepageSection["type"],
    direction: -1 | 1
  ) {
    setConfig((current) => {
      const sections = [
        ...current.sections,
      ].sort(
        (a, b) =>
          a.order - b.order
      );

      const index =
        sections.findIndex(
          (section) =>
            section.type === type
        );

      const target =
        index + direction;

      if (
        index < 0 ||
        target < 0 ||
        target >= sections.length
      ) {
        return current;
      }

      [
        sections[index],
        sections[target],
      ] = [
        sections[target],
        sections[index],
      ];

      return {
        ...current,

        sections:
          sections.map(
            (section, order) => ({
              ...section,
              order,
            })
          ),
      };
    });
  }

  async function saveHomepage() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const normalized: WebsiteHomepageConfig = {
        ...config,

        sections:
          [...config.sections]
            .sort(
              (a, b) =>
                a.order - b.order
            )
            .map(
              (section, order) => ({
                ...section,
                order,
              })
            ),
      };

      const response = await fetch(
        "/api/website-seo/homepage",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              normalized
            ),
        }
      );

      const payload =
        (await response.json()) as {
          ok?: boolean;
          data?: HomepageResponse;
          error?: string;
        };

      if (
        !response.ok ||
        !payload.ok ||
        !payload.data
      ) {
        throw new Error(
          payload.error ??
            "Unable to save homepage."
        );
      }

      setConfigured(true);

      setUpdatedAt(
        payload.data.updatedAt
      );

      if (
        payload.data.config
      ) {
        setConfig(
          payload.data.config
        );
      }

      setMessage(
        "Homepage configuration saved successfully."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save homepage."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-black px-6 py-8 lg:px-8">
        <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website Manager · Homepage"
            title="Public Homepage Manager"
            description="Configure the future RideGrid customer website homepage without modifying the RideGrid Admin Dashboard."
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void loadHomepage()
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
                    void saveHomepage()
                  }
                  disabled={
                    saving ||
                    loading
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  Save Homepage
                </button>
              </div>
            }
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-wide text-zinc-500">
                Configuration
              </div>

              <div className="mt-1 text-lg font-black text-white">
                {loading
                  ? "Loading"
                  : configured
                    ? "Saved"
                    : "Not Configured"}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-wide text-zinc-500">
                Enabled Sections
              </div>

              <div className="mt-1 text-lg font-black text-white">
                {enabledCount} /{" "}
                {config.sections.length}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-wide text-zinc-500">
                Last Saved
              </div>

              <div className="mt-1 truncate text-sm font-black text-white">
                {formatDate(
                  updatedAt
                )}
              </div>
            </div>
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]">
            <div className="space-y-5">
              <WebsiteSeoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                      Hero Configuration
                    </div>

                    <h2 className="mt-2 text-xl font-black text-zinc-950">
                      Homepage hero
                    </h2>
                  </div>

                  <Home className="text-zinc-300" />
                </div>

                <div className="mt-5 grid gap-4">
                  <label>
                    <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                      Eyebrow
                    </div>

                    <input
                      value={
                        config.hero
                          .eyebrow
                      }
                      onChange={(
                        event
                      ) =>
                        updateHero(
                          "eyebrow",
                          event.target
                            .value
                        )
                      }
                      placeholder="Optional short label"
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                    />
                  </label>

                  <label>
                    <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                      Main Heading
                    </div>

                    <input
                      value={
                        config.hero.title
                      }
                      onChange={(
                        event
                      ) =>
                        updateHero(
                          "title",
                          event.target
                            .value
                        )
                      }
                      placeholder="Homepage heading"
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                    />
                  </label>

                  <label>
                    <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                      Subtitle
                    </div>

                    <textarea
                      value={
                        config.hero
                          .subtitle
                      }
                      onChange={(
                        event
                      ) =>
                        updateHero(
                          "subtitle",
                          event.target
                            .value
                        )
                      }
                      rows={3}
                      placeholder="Homepage hero supporting copy"
                      className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                    />
                  </label>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <label>
                      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                        Primary CTA
                      </div>

                      <input
                        value={
                          config.hero
                            .primaryCtaLabel
                        }
                        onChange={(
                          event
                        ) =>
                          updateHero(
                            "primaryCtaLabel",
                            event.target
                              .value
                          )
                        }
                        placeholder="Button label"
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                      />
                    </label>

                    <label>
                      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                        Primary URL
                      </div>

                      <input
                        value={
                          config.hero
                            .primaryCtaHref
                        }
                        onChange={(
                          event
                        ) =>
                          updateHero(
                            "primaryCtaHref",
                            event.target
                              .value
                          )
                        }
                        placeholder="/..."
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                      />
                    </label>

                    <label>
                      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                        Secondary CTA
                      </div>

                      <input
                        value={
                          config.hero
                            .secondaryCtaLabel
                        }
                        onChange={(
                          event
                        ) =>
                          updateHero(
                            "secondaryCtaLabel",
                            event.target
                              .value
                          )
                        }
                        placeholder="Button label"
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                      />
                    </label>

                    <label>
                      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                        Secondary URL
                      </div>

                      <input
                        value={
                          config.hero
                            .secondaryCtaHref
                        }
                        onChange={(
                          event
                        ) =>
                          updateHero(
                            "secondaryCtaHref",
                            event.target
                              .value
                          )
                        }
                        placeholder="/..."
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400"
                      />
                    </label>
                  </div>
                </div>
              </WebsiteSeoCard>

              <WebsiteSeoCard>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                    Homepage Composition
                  </div>

                  <h2 className="mt-2 text-xl font-black text-zinc-950">
                    Sections
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Enable, disable and order public homepage sections.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {[...config.sections]
                    .sort(
                      (a, b) =>
                        a.order -
                        b.order
                    )
                    .map(
                      (
                        section,
                        index
                      ) => (
                        <div
                          key={
                            section.type
                          }
                          className={`rounded-xl border p-4 ${
                            section.enabled
                              ? "border-red-200 bg-red-50/40"
                              : "border-zinc-200 bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical
                              size={18}
                              className="mt-1 shrink-0 text-zinc-300"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex cursor-pointer items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={
                                      section.enabled
                                    }
                                    onChange={() =>
                                      updateSection(
                                        section.type,
                                        {
                                          enabled:
                                            !section.enabled,
                                        }
                                      )
                                    }
                                    className="h-4 w-4 accent-red-600"
                                  />

                                  <span className="font-black text-zinc-950">
                                    {sectionLabel(
                                      section.type
                                    )}
                                  </span>
                                </label>

                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      0
                                    }
                                    onClick={() =>
                                      moveSection(
                                        section.type,
                                        -1
                                      )
                                    }
                                    className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 disabled:opacity-30"
                                  >
                                    <ArrowUp
                                      size={14}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      config
                                        .sections
                                        .length -
                                        1
                                    }
                                    onClick={() =>
                                      moveSection(
                                        section.type,
                                        1
                                      )
                                    }
                                    className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 disabled:opacity-30"
                                  >
                                    <ArrowDown
                                      size={14}
                                    />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 grid gap-2">
                                <input
                                  value={
                                    section.heading
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateSection(
                                      section.type,
                                      {
                                        heading:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  placeholder="Optional section heading"
                                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-red-400"
                                />

                                <input
                                  value={
                                    section.description
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateSection(
                                      section.type,
                                      {
                                        description:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  placeholder="Optional supporting text"
                                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-red-400"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                </div>
              </WebsiteSeoCard>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl bg-zinc-950 p-6 text-white">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
                  <Eye size={15} />
                  Configuration Preview
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-5">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                    {config.hero
                      .eyebrow ||
                      "Hero eyebrow"}
                  </div>

                  <h2 className="mt-3 text-3xl font-black leading-tight">
                    {config.hero
                      .title ||
                      "Homepage heading"}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {config.hero
                      .subtitle ||
                      "Homepage supporting copy will appear here."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {config.hero
                      .primaryCtaLabel ? (
                      <span className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black">
                        {
                          config.hero
                            .primaryCtaLabel
                        }
                      </span>
                    ) : null}

                    {config.hero
                      .secondaryCtaLabel ? (
                      <span className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black">
                        {
                          config.hero
                            .secondaryCtaLabel
                        }
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {[...config.sections]
                    .sort(
                      (a, b) =>
                        a.order -
                        b.order
                    )
                    .filter(
                      (section) =>
                        section.enabled
                    )
                    .map(
                      (
                        section,
                        index
                      ) => (
                        <div
                          key={
                            section.type
                          }
                          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                        >
                          <span className="text-sm font-bold text-zinc-300">
                            {index +
                              1}
                            .{" "}
                            {sectionLabel(
                              section.type
                            )}
                          </span>

                          <span className="text-[10px] font-black uppercase text-emerald-400">
                            Enabled
                          </span>
                        </div>
                      )
                    )}
                </div>
              </div>

              <WebsiteSeoCard>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Architecture
                </div>

                <h2 className="mt-2 text-lg font-black text-zinc-950">
                  Manager now, renderer later
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  This configuration is stored centrally and does not replace the current RideGrid Admin Dashboard.
                </p>

                <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-xs font-bold leading-5 text-zinc-600">
                  Public homepage rendering will consume this configuration when the Public Enterprise Website is assembled.
                </div>
              </WebsiteSeoCard>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}