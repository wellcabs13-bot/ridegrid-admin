"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";

import type {
  WebsiteSeoAiControlSnapshot,
} from "@/lib/website-seo/ai-control/types";

type View =
  | "overview"
  | "strategy"
  | "recommendations"
  | "generation-rules"
  | "quality-guardrails"
  | "approval-modes";

async function request(
  path = "",
  method = "GET",
  body?: unknown
) {
  const response = await fetch(
    `/api/website-seo/ai-control${path}`,
    {
      method,
      headers:
        body === undefined
          ? undefined
          : {
              "Content-Type":
                "application/json",
            },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
      cache: "no-store",
    }
  );

  const result =
    await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.error ??
        "AI control operation failed."
    );
  }

  return result.data;
}

export default function AIControlClient({
  view,
}: {
  view: View;
}) {
  const [snapshot, setSnapshot] =
    useState<WebsiteSeoAiControlSnapshot | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const load =
    useCallback(async () => {
      try {
        setSnapshot(
          await request()
        );
        setError("");
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load AI controls."
        );
      }
    }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(
    payload: unknown
  ) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const next =
        await request(
          "",
          "POST",
          payload
        );

      setSnapshot(next);
      setNotice(
        "AI control settings saved."
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Operation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="px-6 py-12 text-center text-sm font-bold text-zinc-500">
        {error ||
          "Loading AI Control Center…"}
      </div>
    );
  }

  return (
    <>
      <section className="bg-black px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website & SEO · AI Control"
            title="AI Control Center"
            description="Govern RideGrid Website SEO AI strategy, provider readiness, generation policy, quality protections and approval modes without storing provider secrets or bypassing frozen SEO safeguards."
          />
        </div>
      </section>

      <section className="px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {notice}
            </div>
          ) : null}

          {view === "overview" ? (
            <Overview
              snapshot={snapshot}
            />
          ) : null}

          {view === "strategy" ? (
            <Strategy
              snapshot={snapshot}
              mutate={mutate}
              busy={busy}
            />
          ) : null}

          {view ===
          "recommendations" ? (
            <Recommendations
              snapshot={snapshot}
            />
          ) : null}

          {view ===
          "generation-rules" ? (
            <GenerationRules
              snapshot={snapshot}
              mutate={mutate}
              busy={busy}
            />
          ) : null}

          {view ===
          "quality-guardrails" ? (
            <Guardrails
              snapshot={snapshot}
            />
          ) : null}

          {view ===
          "approval-modes" ? (
            <ApprovalModes
              snapshot={snapshot}
              mutate={mutate}
              busy={busy}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

function Overview({
  snapshot,
}: {
  snapshot: WebsiteSeoAiControlSnapshot;
}) {
  const [health, setHealth] =
    useState<null | {
      available: boolean;
      provider: string;
      model: string;
      reason?: string | null;
      latency?: number;
    }>(null);

  const [checking, setChecking] =
    useState(false);

  async function checkHealth() {
    setChecking(true);

    try {
      setHealth(
        await request(
          "/health",
          "POST"
        )
      );
    } finally {
      setChecking(false);
    }
  }

  const env =
    snapshot.environment;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Website SEO AI"
          value={
            env.websiteSeoAiEnabled
              ? "ENABLED"
              : "DISABLED"
          }
        />
        <Metric
          label="Provider"
          value={env.globalProvider}
        />
        <Metric
          label="Model"
          value={env.globalModel}
        />
        <Metric
          label="Approval"
          value={
            snapshot.state
              .approvalMode
          }
        />
      </div>

      <WebsiteSeoCard>
        <h2 className="text-lg font-black">
          Provider Readiness
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StateRow
            label="Runtime"
            value={env.runtimeState}
          />
          <StateRow
            label="API Key"
            value={
              env.apiKeyConfigured
                ? "CONFIGURED"
                : "NOT CONFIGURED"
            }
          />
          <StateRow
            label="Custom Endpoint"
            value={
              env.endpointConfigured
                ? "CONFIGURED"
                : "NOT REQUIRED / MISSING"
            }
          />
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Provider secrets are read only from server environment variables and are never returned by this control center.
        </p>

        <button
          type="button"
          disabled={checking}
          onClick={() =>
            void checkHealth()
          }
          className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-black text-white"
        >
          {checking
            ? "Checking…"
            : "Check Provider Health"}
        </button>

        {health ? (
          <div className="mt-4 rounded-xl border border-zinc-200 p-4 text-sm">
            <div className="font-black">
              {health.available
                ? "AVAILABLE"
                : "UNAVAILABLE"}
            </div>

            <div className="mt-1 text-zinc-500">
              {health.provider} ·{" "}
              {health.model}
              {typeof health.latency ===
              "number"
                ? ` · ${health.latency} ms`
                : ""}
            </div>

            {health.reason ? (
              <div className="mt-2 text-red-600">
                {health.reason}
              </div>
            ) : null}
          </div>
        ) : null}
      </WebsiteSeoCard>

      <WebsiteSeoCard>
        <h2 className="text-lg font-black">
          Runtime Boundary
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          W13 configures AI governance only. Existing W5 deterministic generation remains unchanged until the Website SEO AI runtime is intentionally connected. W5/W6 quality and W7 publication protections remain authoritative.
        </p>
      </WebsiteSeoCard>
    </>
  );
}

function Strategy({
  snapshot,
  mutate,
  busy,
}: {
  snapshot: WebsiteSeoAiControlSnapshot;
  mutate: (
    payload: unknown
  ) => Promise<void>;
  busy: boolean;
}) {
  const strategy =
    snapshot.state.strategy;

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const data =
      new FormData(
        event.currentTarget
      );

    await mutate({
      operation:
        "UPDATE_STRATEGY",
      strategy: {
        objective:
          data.get("objective"),
        brandVoice:
          data.get("brandVoice"),
        providerPolicy:
          data.get(
            "providerPolicy"
          ),
      },
    });
  }

  return (
    <WebsiteSeoCard>
      <h2 className="text-lg font-black">
        AI Strategy
      </h2>

      <form
        onSubmit={submit}
        className="mt-4 grid gap-4 md:grid-cols-3"
      >
        <Select
          name="objective"
          label="Objective"
          defaultValue={
            strategy.objective
          }
          values={[
            "QUALITY_FIRST",
            "BALANCED",
            "SCALE",
          ]}
        />

        <Select
          name="brandVoice"
          label="Brand Voice"
          defaultValue={
            strategy.brandVoice
          }
          values={[
            "PREMIUM_TRUSTED",
            "DIRECT_COMMERCIAL",
            "INFORMATIVE",
          ]}
        />

        <Select
          name="providerPolicy"
          label="Provider Policy"
          defaultValue={
            strategy.providerPolicy
          }
          values={[
            "LOCAL_FIRST",
            "AI_WHEN_AVAILABLE",
          ]}
        />

        <div className="md:col-span-3 rounded-xl bg-zinc-50 p-4 text-sm">
          Target market: INDIA · Locale: en-IN
        </div>

        <button
          disabled={busy}
          className="w-fit rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white"
        >
          Save Strategy
        </button>
      </form>
    </WebsiteSeoCard>
  );
}

function Recommendations({
  snapshot,
}: {
  snapshot: WebsiteSeoAiControlSnapshot;
}) {
  return (
    <WebsiteSeoCard>
      <h2 className="text-lg font-black">
        Recommendations
      </h2>

      <p className="mt-1 text-sm text-zinc-500">
        Deterministic control-plane recommendations based only on actual configuration state. These are not fabricated AI insights.
      </p>

      <div className="mt-4 space-y-3">
        {snapshot.recommendations.length ===
        0 ? (
          <div className="py-8 text-center text-sm font-bold text-zinc-400">
            No current recommendations.
          </div>
        ) : (
          snapshot.recommendations.map(
            (item) => (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <div className="text-xs font-black text-red-600">
                  {item.severity}
                </div>
                <div className="mt-1 font-black">
                  {item.title}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  {item.description}
                </div>
              </div>
            )
          )
        )}
      </div>
    </WebsiteSeoCard>
  );
}

function GenerationRules({
  snapshot,
  mutate,
  busy,
}: {
  snapshot: WebsiteSeoAiControlSnapshot;
  mutate: (
    payload: unknown
  ) => Promise<void>;
  busy: boolean;
}) {
  const rules =
    snapshot.state.generationRules;

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const data =
      new FormData(
        event.currentTarget
      );

    const checked = (
      name: string
    ) => data.get(name) === "on";

    await mutate({
      operation:
        "UPDATE_GENERATION_RULES",
      generationRules: {
        contentDrafts:
          checked(
            "contentDrafts"
          ),
        metadataSuggestions:
          checked(
            "metadataSuggestions"
          ),
        faqSuggestions:
          checked(
            "faqSuggestions"
          ),
        internalLinkSuggestions:
          checked(
            "internalLinkSuggestions"
          ),
        keywordSuggestions:
          checked(
            "keywordSuggestions"
          ),
        maxBatchSize:
          Number(
            data.get(
              "maxBatchSize"
            )
          ),
        maxOutputCharacters:
          Number(
            data.get(
              "maxOutputCharacters"
            )
          ),
      },
    });
  }

  return (
    <WebsiteSeoCard>
      <h2 className="text-lg font-black">
        Generation Rules
      </h2>

      <form
        onSubmit={submit}
        className="mt-4 space-y-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {[
            [
              "contentDrafts",
              "Content Drafts",
              rules.contentDrafts,
            ],
            [
              "metadataSuggestions",
              "Metadata Suggestions",
              rules.metadataSuggestions,
            ],
            [
              "faqSuggestions",
              "FAQ Suggestions",
              rules.faqSuggestions,
            ],
            [
              "internalLinkSuggestions",
              "Internal Link Suggestions",
              rules.internalLinkSuggestions,
            ],
            [
              "keywordSuggestions",
              "AI Keyword Suggestions",
              rules.keywordSuggestions,
            ],
          ].map(
            ([name, label, value]) => (
              <label
                key={String(name)}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold"
              >
                <input
                  name={String(name)}
                  type="checkbox"
                  defaultChecked={
                    Boolean(value)
                  }
                />
                {String(label)}
              </label>
            )
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold">
            Maximum Batch Size
            <input
              name="maxBatchSize"
              type="number"
              min="1"
              max="25"
              defaultValue={
                rules.maxBatchSize
              }
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
          </label>

          <label className="text-sm font-bold">
            Maximum Output Characters
            <input
              name="maxOutputCharacters"
              type="number"
              min="1000"
              max="100000"
              defaultValue={
                rules.maxOutputCharacters
              }
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
          </label>
        </div>

        <button
          disabled={busy}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white"
        >
          Save Generation Rules
        </button>
      </form>
    </WebsiteSeoCard>
  );
}

function Guardrails({
  snapshot,
}: {
  snapshot: WebsiteSeoAiControlSnapshot;
}) {
  return (
    <WebsiteSeoCard>
      <h2 className="text-lg font-black">
        Quality Guardrails
      </h2>

      <p className="mt-1 text-sm text-zinc-500">
        Critical RideGrid SEO quality protections are locked ON and cannot be weakened from the dashboard.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.entries(
          snapshot.state.guardrails
        ).map(([name, value]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-4"
          >
            <span className="text-sm font-bold">
              {name
                .replace(
                  /([A-Z])/g,
                  " $1"
                )
                .replace(/^./, (v) =>
                  v.toUpperCase()
                )}
            </span>

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              {value
                ? "LOCKED ON"
                : "OFF"}
            </span>
          </div>
        ))}
      </div>
    </WebsiteSeoCard>
  );
}

function ApprovalModes({
  snapshot,
  mutate,
  busy,
}: {
  snapshot: WebsiteSeoAiControlSnapshot;
  mutate: (
    payload: unknown
  ) => Promise<void>;
  busy: boolean;
}) {
  return (
    <WebsiteSeoCard>
      <h2 className="text-lg font-black">
        AI Approval Mode
      </h2>

      <p className="mt-1 text-sm text-zinc-500">
        This controls AI-assisted Website SEO governance. AUTOMATIC never disables W5 quality, W6 indexability, manual ownership or W7 publication readiness.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {[
          "MANUAL",
          "ASSISTED",
          "AUTOMATIC",
        ].map((mode) => (
          <button
            key={mode}
            disabled={busy}
            type="button"
            onClick={() =>
              void mutate({
                operation:
                  "SET_APPROVAL_MODE",
                approvalMode: mode,
              })
            }
            className={`rounded-xl px-4 py-2.5 text-sm font-black ${
              snapshot.state
                .approvalMode ===
              mode
                ? "bg-red-600 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </WebsiteSeoCard>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <WebsiteSeoCard>
      <div className="text-xs font-black uppercase text-zinc-400">
        {label}
      </div>
      <div className="mt-2 break-words text-xl font-black">
        {value}
      </div>
    </WebsiteSeoCard>
  );
}

function StateRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <div className="text-xs font-black uppercase text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">
        {value}
      </div>
    </div>
  );
}

function Select({
  name,
  label,
  defaultValue,
  values,
}: {
  name: string;
  label: string;
  defaultValue: string;
  values: string[];
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2"
      >
        {values.map((value) => (
          <option
            key={value}
            value={value}
          >
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}