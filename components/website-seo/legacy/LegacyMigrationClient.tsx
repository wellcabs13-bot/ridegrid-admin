"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Entry = {
  id: string;
  label: string;
  sourcePath: string;
  targetPath: string | null;
  strategy: "REDIRECT" | "GUIDE" | "RETIRE";
  status: "PLANNED" | "READY" | "ACTIVE" | "ARCHIVED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "ROUTE" | "CITY" | "SERVICE" | "GUIDE" | "OTHER";
  notes: string | null;
};

const blank = {
  label: "",
  sourcePath: "",
  targetPath: "",
  strategy: "REDIRECT",
  priority: "HIGH",
  category: "ROUTE",
  notes: "",
};

export default function LegacyMigrationClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(
      "/api/website-seo/legacy-migration",
      { cache: "no-store" },
    );

    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error);
    }

    setEntries(json.data.entries || []);
    setCounts(json.data.counts || null);
  }, []);

  useEffect(() => {
    load().catch((error) =>
      setMessage(error.message),
    );
  }, [load]);

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const priority = {
          HIGH: 0,
          MEDIUM: 1,
          LOW: 2,
        };

        return (
          priority[a.priority] -
            priority[b.priority] ||
          a.sourcePath.localeCompare(b.sourcePath)
        );
      }),
    [entries],
  );

  async function bootstrap() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/website-seo/legacy-migration",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "bootstrap",
          }),
        },
      );

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error);
      }

      await load();
      setMessage(
        "Verified legacy Wellcabs URLs loaded as PLANNED. Nothing was activated.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bootstrap failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const endpoint = editing
        ? `/api/website-seo/legacy-migration/${editing}`
        : "/api/website-seo/legacy-migration";

      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error);
      }

      setEditing(null);
      setForm(blank);
      await load();
      setMessage(
        editing ? "Mapping updated." : "Mapping created.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Save failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patch(
    id: string,
    values: Record<string, unknown>,
  ) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/website-seo/legacy-migration/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        },
      );

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error);
      }

      await load();
      setMessage("Migration status updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Update failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this migration mapping?")) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `/api/website-seo/legacy-migration/${id}`,
        { method: "DELETE" },
      );

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error);
      }

      await load();
      setMessage("Mapping deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Delete failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function edit(entry: Entry) {
    setEditing(entry.id);
    setForm({
      label: entry.label,
      sourcePath: entry.sourcePath,
      targetPath: entry.targetPath || "",
      strategy: entry.strategy,
      status: entry.status,
      priority: entry.priority,
      category: entry.category,
      notes: entry.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">
              Legacy SEO Migration
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Old Wellcabs URLs → Fresh RideGrid Pages
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Preserve existing SEO equity without copying the old website.
              Rebuild valuable pages, permanently redirect old commercial URLs,
              preserve selected guides, and retire obsolete URLs safely.
            </p>
          </div>

          <button
            disabled={busy}
            onClick={bootstrap}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Load Verified Legacy URLs
          </button>
        </div>

        {counts && (
          <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Total", counts.total],
              ["High Priority", counts.highPriority],
              ["Planned", counts.planned],
              ["Ready", counts.ready],
              ["Active", counts.active],
              ["Archived", counts.archived],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <form
        onSubmit={submit}
        className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950">
            {editing ? "Edit Migration" : "Add Legacy URL"}
          </h2>

          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
              className="text-sm font-semibold text-slate-500"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            required
            value={form.label}
            onChange={(event) =>
              setForm({
                ...form,
                label: event.target.value,
              })
            }
            placeholder="Page / mapping label"
            className="rounded-xl border border-slate-200 px-4 py-3"
          />

          <input
            required
            value={form.sourcePath}
            onChange={(event) =>
              setForm({
                ...form,
                sourcePath: event.target.value,
              })
            }
            placeholder="/old-wellcabs-url/"
            className="rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm"
          />

          <input
            value={form.targetPath}
            onChange={(event) =>
              setForm({
                ...form,
                targetPath: event.target.value,
              })
            }
            placeholder="/routes/new-page"
            className="rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm"
          />

          <select
            value={form.strategy}
            onChange={(event) =>
              setForm({
                ...form,
                strategy: event.target.value,
              })
            }
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="REDIRECT">Permanent Redirect</option>
            <option value="GUIDE">Preserve as Guide</option>
            <option value="RETIRE">Retire / 410</option>
          </select>

          <select
            value={form.category}
            onChange={(event) =>
              setForm({
                ...form,
                category: event.target.value,
              })
            }
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="ROUTE">Route</option>
            <option value="CITY">City</option>
            <option value="SERVICE">Service</option>
            <option value="GUIDE">Guide</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={form.priority}
            onChange={(event) =>
              setForm({
                ...form,
                priority: event.target.value,
              })
            }
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        <textarea
          value={form.notes}
          onChange={(event) =>
            setForm({
              ...form,
              notes: event.target.value,
            })
          }
          placeholder="Migration notes"
          rows={3}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3"
        />

        <button
          disabled={busy}
          className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {editing ? "Save Changes" : "Add Mapping"}
        </button>

        {message && (
          <p className="mt-4 text-sm font-medium text-slate-700">
            {message}
          </p>
        )}
      </form>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            Migration Inventory
          </h2>
        </div>

        {!sorted.length ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No legacy URLs loaded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map((entry) => (
              <div
                key={entry.id}
                className="p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {entry.priority}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {entry.category}
                      </span>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                        {entry.status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {entry.strategy}
                      </span>
                    </div>

                    <h3 className="mt-3 font-bold text-slate-950">
                      {entry.label}
                    </h3>

                    <p className="mt-2 break-all font-mono text-sm text-slate-600">
                      {entry.sourcePath}
                    </p>

                    {entry.targetPath && (
                      <p className="mt-1 break-all font-mono text-sm text-emerald-700">
                        → {entry.targetPath}
                      </p>
                    )}

                    {entry.notes && (
                      <p className="mt-2 text-sm text-slate-500">
                        {entry.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() => edit(entry)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      Edit
                    </button>

                    {entry.status === "PLANNED" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          patch(entry.id, {
                            status: "READY",
                          })
                        }
                        className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800"
                      >
                        Mark Ready
                      </button>
                    )}

                    {entry.status === "READY" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          patch(entry.id, {
                            status: "ACTIVE",
                          })
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Activate
                      </button>
                    )}

                    {entry.status === "ACTIVE" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          patch(entry.id, {
                            status: "READY",
                          })
                        }
                        className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold"
                      >
                        Deactivate
                      </button>
                    )}

                    <button
                      disabled={busy}
                      onClick={() => remove(entry.id)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}