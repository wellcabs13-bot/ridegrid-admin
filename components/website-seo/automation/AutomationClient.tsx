"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import WebsiteSeoSectionHeader from "@/components/website-seo/WebsiteSeoSectionHeader";
import WebsiteSeoCard from "@/components/website-seo/ui/WebsiteSeoCard";

import {
  WEBSITE_AUTOMATION_ACTIONS,
  type WebsiteAutomationAction,
  type WebsiteAutomationState,
} from "@/lib/website-seo/automation/types";

type View =
  | "overview"
  | "workflows"
  | "rules"
  | "schedules"
  | "activity"
  | "failures";

async function api(
  path: string,
  method = "GET",
  body?: unknown
) {
  const response = await fetch(
    `/api/website-seo/automation${path}`,
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
        "Automation operation failed."
    );
  }

  return result.data;
}

export default function AutomationClient({
  view,
}: {
  view: View;
}) {
  const [state, setState] =
    useState<WebsiteAutomationState | null>(
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
      setError("");

      try {
        setState(
          await api("")
        );
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load automation."
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
        await api(
          "",
          "POST",
          payload
        );

      setState(next);
      setNotice("Saved successfully.");
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

  if (!state) {
    return (
      <div className="px-6 py-12 text-center text-sm font-bold text-zinc-500">
        {error || "Loading automation…"}
      </div>
    );
  }

  const counts = {
    workflows:
      state.workflows.length,
    rules:
      state.rules.length,
    schedules:
      state.schedules.length,
    activity:
      state.activity.length,
    failures:
      state.failures.length,
  };

  return (
    <>
      <section className="bg-black px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <WebsiteSeoSectionHeader
            eyebrow="Website & SEO · Automation"
            title="Automation Engine"
            description="Controlled workflow orchestration over RideGrid's frozen Website SEO engines. Background execution requires AUTOMATIC mode; W7 publishing guardrails remain authoritative."
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
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {Object.entries(counts).map(
                  ([label, value]) => (
                    <WebsiteSeoCard key={label}>
                      <div className="text-xs font-black uppercase text-zinc-400">
                        {label}
                      </div>
                      <div className="mt-2 text-3xl font-black">
                        {value}
                      </div>
                    </WebsiteSeoCard>
                  )
                )}
              </div>

              <WebsiteSeoCard>
                <h2 className="text-lg font-black">
                  Approval Mode
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  MANUAL and ASSISTED never run rules or schedules in the background. AUTOMATIC permits rule/schedule execution but central publishing guardrails still apply.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "MANUAL",
                    "ASSISTED",
                    "AUTOMATIC",
                  ].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate({
                          operation:
                            "SET_MODE",
                          mode,
                        })
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-black ${
                        state.approvalMode ===
                        mode
                          ? "bg-red-600 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-zinc-950 p-4 text-sm text-zinc-300">
                  Automatic publishing is currently centrally disabled. Automation can generate, optimize and evaluate readiness without bypassing W7 ownership/manual-protection rules.
                </div>
              </WebsiteSeoCard>
            </>
          ) : null}

          {view === "workflows" ? (
            <WorkflowView
              state={state}
              busy={busy}
              mutate={mutate}
              reload={load}
              setNotice={setNotice}
              setError={setError}
            />
          ) : null}

          {view === "rules" ? (
            <RuleView
              state={state}
              busy={busy}
              mutate={mutate}
            />
          ) : null}

          {view === "schedules" ? (
            <ScheduleView
              state={state}
              busy={busy}
              mutate={mutate}
              reload={load}
              setNotice={setNotice}
              setError={setError}
            />
          ) : null}

          {view === "activity" ? (
            <ActivityView
              rows={state.activity}
            />
          ) : null}

          {view === "failures" ? (
            <ActivityView
              rows={state.failures}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

function WorkflowView({
  state,
  busy,
  mutate,
  reload,
  setNotice,
  setError,
}: any) {
  const [actions, setActions] =
    useState<WebsiteAutomationAction[]>([
      "GENERATE_PAGE",
      "GENERATE_KEYWORDS",
      "GENERATE_CONTENT",
      "GENERATE_SEO",
      "READINESS_PREVIEW",
    ]);

  async function create(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const data =
      new FormData(event.currentTarget);

    await mutate({
      operation: "UPSERT_WORKFLOW",
      workflow: {
        id: crypto.randomUUID(),
        name: String(
          data.get("name") ?? ""
        ),
        enabled: true,
        actions,
      },
    });

    event.currentTarget.reset();
  }

  async function run(
    workflowId: string,
    entityId: string
  ) {
    if (!entityId.trim()) {
      setError("Entity id is required.");
      return;
    }

    try {
      const result =
        await api(
          "/run",
          "POST",
          {
            workflowId,
            entityId,
          }
        );

      setNotice(
        `Run finished: ${result.status}`
      );

      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Workflow execution failed."
      );
    }
  }

  return (
    <>
      <WebsiteSeoCard>
        <h2 className="text-lg font-black">
          Create Workflow
        </h2>

        <form
          onSubmit={create}
          className="mt-4 space-y-4"
        >
          <input
            name="name"
            required
            placeholder="Workflow name"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />

          <div className="grid gap-2 md:grid-cols-2">
            {WEBSITE_AUTOMATION_ACTIONS.map(
              (action) => (
                <label
                  key={action}
                  className="flex items-center gap-2 rounded-xl border p-3 text-sm font-bold"
                >
                  <input
                    type="checkbox"
                    checked={actions.includes(
                      action
                    )}
                    onChange={(event) =>
                      setActions(
                        event.target.checked
                          ? [
                              ...actions,
                              action,
                            ]
                          : actions.filter(
                              (item) =>
                                item !==
                                action
                            )
                      )
                    }
                  />
                  {action}
                </label>
              )
            )}
          </div>

          <button
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white"
          >
            Add Workflow
          </button>
        </form>
      </WebsiteSeoCard>

      <div className="space-y-3">
        {state.workflows.map(
          (workflow: any) => (
            <WebsiteSeoCard
              key={workflow.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">
                    {workflow.name}
                  </h3>

                  <div className="mt-2 text-xs text-zinc-500">
                    {workflow.actions.join(
                      " → "
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    void mutate({
                      operation:
                        "DELETE_WORKFLOW",
                      id: workflow.id,
                    })
                  }
                  className="text-xs font-black text-red-600"
                >
                  Delete
                </button>
              </div>

              <ManualRunner
                workflowId={workflow.id}
                run={run}
              />
            </WebsiteSeoCard>
          )
        )}
      </div>
    </>
  );
}

function ManualRunner({
  workflowId,
  run,
}: {
  workflowId: string;
  run: (
    workflowId: string,
    entityId: string
  ) => Promise<void>;
}) {
  const [entityId, setEntityId] =
    useState("");

  return (
    <div className="mt-4 flex gap-2">
      <input
        value={entityId}
        onChange={(event) =>
          setEntityId(
            event.target.value
          )
        }
        placeholder="Website entity ID"
        className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() =>
          void run(
            workflowId,
            entityId
          )
        }
        className="rounded-xl bg-black px-4 py-2 text-sm font-black text-white"
      >
        Run
      </button>
    </div>
  );
}

function RuleView({
  state,
  busy,
  mutate,
}: any) {
  async function create(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const data =
      new FormData(event.currentTarget);

    await mutate({
      operation: "UPSERT_RULE",
      rule: {
        id: crypto.randomUUID(),
        name: String(
          data.get("name") ?? ""
        ),
        enabled: true,
        workflowId: String(
          data.get("workflowId") ?? ""
        ),
        entityType:
          String(
            data.get("entityType") ?? ""
          ) || null,
        entityStatus:
          String(
            data.get("entityStatus") ??
              ""
          ) || null,
      },
    });

    event.currentTarget.reset();
  }

  return (
    <>
      <WebsiteSeoCard>
        <h2 className="text-lg font-black">
          Automation Rules
        </h2>

        <form
          onSubmit={create}
          className="mt-4 grid gap-3 lg:grid-cols-4"
        >
          <input
            name="name"
            required
            placeholder="Rule name"
            className="rounded-xl border px-3 py-2"
          />

          <select
            name="workflowId"
            required
            className="rounded-xl border px-3 py-2"
          >
            <option value="">
              Select workflow
            </option>

            {state.workflows.map(
              (workflow: any) => (
                <option
                  key={workflow.id}
                  value={workflow.id}
                >
                  {workflow.name}
                </option>
              )
            )}
          </select>

          <select
            name="entityType"
            className="rounded-xl border px-3 py-2"
          >
            <option value="">
              Any entity type
            </option>
            {[
              "ROUTE",
              "CITY",
              "SERVICE",
              "AIRPORT",
              "AREA",
              "VEHICLE",
            ].map((value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>

          <select
            name="entityStatus"
            className="rounded-xl border px-3 py-2"
          >
            <option value="">
              Any status
            </option>
            {[
              "DRAFT",
              "ACTIVE",
              "INACTIVE",
              "ARCHIVED",
            ].map((value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>

          <button
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white"
          >
            Add Rule
          </button>
        </form>
      </WebsiteSeoCard>

      <WebsiteSeoCard>
        <div className="space-y-3">
          {state.rules.length === 0
            ? "No automation rules configured."
            : state.rules.map(
                (rule: any) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div>
                      <div className="font-black">
                        {rule.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {rule.entityType ??
                          "ANY TYPE"}{" "}
                        ·{" "}
                        {rule.entityStatus ??
                          "ANY STATUS"}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        void mutate({
                          operation:
                            "DELETE_RULE",
                          id: rule.id,
                        })
                      }
                      className="text-xs font-black text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )
              )}
        </div>
      </WebsiteSeoCard>
    </>
  );
}

function ScheduleView({
  state,
  busy,
  mutate,
  reload,
  setNotice,
  setError,
}: any) {
  async function create(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const data =
      new FormData(event.currentTarget);

    await mutate({
      operation:
        "UPSERT_SCHEDULE",
      schedule: {
        id: crypto.randomUUID(),
        name: String(
          data.get("name") ?? ""
        ),
        enabled: true,
        workflowId: String(
          data.get("workflowId") ?? ""
        ),
        entityId: String(
          data.get("entityId") ?? ""
        ),
        cadence: String(
          data.get("cadence") ??
            "DAILY"
        ),
        nextRunAt: new Date(
          String(
            data.get("nextRunAt") ?? ""
          )
        ).toISOString(),
      },
    });

    event.currentTarget.reset();
  }

  async function runDue() {
    try {
      const result =
        await api(
          "/run-due",
          "POST"
        );

      setNotice(
        result.blocked
          ? result.reason
          : `Processed ${result.processed} due schedule(s).`
      );

      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to process schedules."
      );
    }
  }

  return (
    <>
      <WebsiteSeoCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">
              Schedules
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              No fake daemon is assumed. The due-run endpoint can later be invoked by production cron. Background execution requires AUTOMATIC mode.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void runDue()
            }
            className="rounded-xl bg-black px-4 py-2 text-sm font-black text-white"
          >
            Run Due Now
          </button>
        </div>

        <form
          onSubmit={create}
          className="mt-4 grid gap-3 lg:grid-cols-5"
        >
          <input
            name="name"
            required
            placeholder="Schedule name"
            className="rounded-xl border px-3 py-2"
          />

          <select
            name="workflowId"
            required
            className="rounded-xl border px-3 py-2"
          >
            <option value="">
              Workflow
            </option>

            {state.workflows.map(
              (workflow: any) => (
                <option
                  key={workflow.id}
                  value={workflow.id}
                >
                  {workflow.name}
                </option>
              )
            )}
          </select>

          <input
            name="entityId"
            required
            placeholder="Entity ID"
            className="rounded-xl border px-3 py-2"
          />

          <select
            name="cadence"
            className="rounded-xl border px-3 py-2"
          >
            <option>DAILY</option>
            <option>WEEKLY</option>
            <option>MONTHLY</option>
          </select>

          <input
            name="nextRunAt"
            required
            type="datetime-local"
            className="rounded-xl border px-3 py-2"
          />

          <button
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white"
          >
            Add Schedule
          </button>
        </form>
      </WebsiteSeoCard>

      <WebsiteSeoCard>
        <div className="space-y-3">
          {state.schedules.length === 0
            ? "No schedules configured."
            : state.schedules.map(
                (schedule: any) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div>
                      <div className="font-black">
                        {schedule.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {schedule.cadence} · Next{" "}
                        {new Date(
                          schedule.nextRunAt
                        ).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        void mutate({
                          operation:
                            "DELETE_SCHEDULE",
                          id: schedule.id,
                        })
                      }
                      className="text-xs font-black text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )
              )}
        </div>
      </WebsiteSeoCard>
    </>
  );
}

function ActivityView({
  rows,
}: {
  rows: WebsiteAutomationState["activity"];
}) {
  return (
    <WebsiteSeoCard>
      <h2 className="text-lg font-black">
        Execution History
      </h2>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm font-bold text-zinc-400">
            No records yet.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-zinc-200 p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div className="font-black">
                  {row.workflowName}
                </div>
                <div className="text-xs font-black">
                  {row.status}
                </div>
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                {row.trigger} ·{" "}
                {new Date(
                  row.occurredAt
                ).toLocaleString()}
              </div>

              {row.error ? (
                <div className="mt-2 text-xs font-bold text-red-600">
                  {row.error}
                </div>
              ) : null}

              <div className="mt-3 text-xs text-zinc-500">
                {row.steps.map(
                  (step) =>
                    `${step.action}: ${step.status}`
                ).join(" · ")}
              </div>
            </div>
          ))
        )}
      </div>
    </WebsiteSeoCard>
  );
}