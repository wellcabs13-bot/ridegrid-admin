"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type Corporate = {
  id: string;
  companyName: string;
  legalName?: string | null;
  gstNumber?: string | null;
  email: string;
  mobile: string;
  city: string;
  state: string;
  pincode: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  billingCycle: string;
  approvalFlow: string;
  creditLimit?: string | number | null;
  paymentTermsDays?: number | null;
  createdAt: string;
};

type CorporateForm = {
  companyName: string;
  legalName: string;
  gstNumber: string;
  panNumber: string;
  email: string;
  mobile: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  billingCycle: "PER_TRIP" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  approvalFlow: "NONE" | "MANAGER" | "MANAGER_FINANCE" | "CUSTOM";
  creditLimit: string;
  paymentTermsDays: string;
};

const emptyForm: CorporateForm = {
  companyName: "",
  legalName: "",
  gstNumber: "",
  panNumber: "",
  email: "",
  mobile: "",
  website: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  approvalFlow: "MANAGER",
  creditLimit: "",
  paymentTermsDays: "30",
};

export default function CorporatePage() {
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Corporate | null>(null);
  const [form, setForm] = useState<CorporateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCorporates = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/corporate", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load corporate accounts."
        );
      }

      setCorporates(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("Corporate loading error:", error);
      setCorporates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCorporates();
  }, [fetchCorporates]);

  const filtered = useMemo(() => {
    const value = search.toLowerCase().trim();
    const cityValue = city.toLowerCase().trim();

    return corporates.filter((item) => {
      const matchesSearch =
        !value ||
        item.companyName.toLowerCase().includes(value) ||
        item.email.toLowerCase().includes(value) ||
        item.mobile.toLowerCase().includes(value) ||
        item.city.toLowerCase().includes(value);

      const matchesStatus = !status || item.status === status;

      const matchesCity =
        !cityValue ||
        item.city.toLowerCase().includes(cityValue);

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [corporates, search, status, city]);

  const active = filtered.filter(
    (item) => item.status === "ACTIVE"
  ).length;

  const inactive = filtered.filter(
    (item) => item.status !== "ACTIVE"
  ).length;

  function openCreate() {
    setSelected(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(item: Corporate) {
    setSelected(item);

    setForm({
      ...emptyForm,
      companyName: item.companyName,
      legalName: item.legalName ?? "",
      gstNumber: item.gstNumber ?? "",
      email: item.email,
      mobile: item.mobile,
      city: item.city,
      state: item.state,
      pincode: item.pincode,
      status: item.status,
      billingCycle:
        item.billingCycle as CorporateForm["billingCycle"],
      approvalFlow:
        item.approvalFlow as CorporateForm["approvalFlow"],
      creditLimit:
        item.creditLimit == null
          ? ""
          : String(item.creditLimit),
      paymentTermsDays:
        item.paymentTermsDays == null
          ? "30"
          : String(item.paymentTermsDays),
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setSelected(null);
    setForm({ ...emptyForm });
  }

  async function saveCorporate(event: React.FormEvent) {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      const payload = {
        ...form,
        creditLimit: form.creditLimit
          ? Number(form.creditLimit)
          : null,
        paymentTermsDays: Number(
          form.paymentTermsDays || 30
        ),
      };

      const response = await fetch("/api/corporate", {
        method: selected ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          selected
            ? {
                id: selected.id,
                ...payload,
              }
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save corporate account."
        );
      }

      closeModal();
      await fetchCorporates();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save corporate account."
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveCorporate(id: string) {
    if (
      !window.confirm(
        "Archive this corporate account?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/corporate?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to archive corporate account."
        );
      }

      await fetchCorporates();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to archive corporate account."
      );
    }
  }

  function updateField<K extends keyof CorporateForm>(
    key: K,
    value: CorporateForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              CORPORATE MANAGEMENT
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Corporate Accounts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage enterprise clients, billing and travel
              controls.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Add Corporate
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            title="Total Corporates"
            value={filtered.length}
          />

          <Stat
            title="Active"
            value={active}
          />

          <Stat
            title="Inactive / Suspended"
            value={inactive}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search company, email, mobile..."
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className={inputClass}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <input
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              placeholder="Filter by city"
              className={inputClass}
            />

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setCity("");
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Company",
                    "Contact",
                    "Location",
                    "Billing",
                    "Approval",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading corporate accounts...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No corporate accounts found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {item.companyName}
                        </div>

                        <div className="text-xs text-slate-500">
                          {item.gstNumber ||
                            "GST not provided"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-800">
                          {item.email}
                        </div>

                        <div className="text-xs text-slate-500">
                          {item.mobile}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.city}, {item.state}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {item.billingCycle.replaceAll(
                          "_",
                          " "
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.approvalFlow.replaceAll(
                          "_",
                          " "
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : item.status === "SUSPENDED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(item)
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              archiveCorporate(item.id)
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selected
                      ? "Edit Corporate"
                      : "Add Corporate"}
                  </h2>

                  <p className="text-sm text-slate-500">
                    Enterprise account information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={saveCorporate}
                className="space-y-6 p-6"
              >
                <Section title="Company Information">
                  <Field
                    label="Company Name"
                    required
                  >
                    <input
                      required
                      value={form.companyName}
                      onChange={(e) =>
                        updateField(
                          "companyName",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Legal Name">
                    <input
                      value={form.legalName}
                      onChange={(e) =>
                        updateField(
                          "legalName",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="GST Number">
                    <input
                      value={form.gstNumber}
                      onChange={(e) =>
                        updateField(
                          "gstNumber",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="PAN Number">
                    <input
                      value={form.panNumber}
                      onChange={(e) =>
                        updateField(
                          "panNumber",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </Section>

                <Section title="Contact">
                  <Field label="Email" required>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        updateField(
                          "email",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Mobile" required>
                    <input
                      required
                      value={form.mobile}
                      onChange={(e) =>
                        updateField(
                          "mobile",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Website">
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) =>
                        updateField(
                          "website",
                          e.target.value
                        )
                      }
                      className={inputClass}
                      placeholder="https://example.com"
                    />
                  </Field>

                  <Field label="Pincode" required>
                    <input
                      required
                      value={form.pincode}
                      onChange={(e) =>
                        updateField(
                          "pincode",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </Section>

                <Section title="Address">
                  <div className="md:col-span-2">
                    <Field
                      label="Address"
                      required
                    >
                      <textarea
                        required
                        rows={3}
                        value={form.address}
                        onChange={(e) =>
                          updateField(
                            "address",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="City" required>
                    <input
                      required
                      value={form.city}
                      onChange={(e) =>
                        updateField(
                          "city",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="State" required>
                    <input
                      required
                      value={form.state}
                      onChange={(e) =>
                        updateField(
                          "state",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Country">
                    <input
                      value={form.country}
                      onChange={(e) =>
                        updateField(
                          "country",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </Section>

                <Section title="Commercial Controls">
                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateField(
                          "status",
                          e.target.value as CorporateForm["status"]
                        )
                      }
                      className={inputClass}
                    >
                      <option value="ACTIVE">
                        Active
                      </option>
                      <option value="INACTIVE">
                        Inactive
                      </option>
                      <option value="SUSPENDED">
                        Suspended
                      </option>
                    </select>
                  </Field>

                  <Field label="Billing Cycle">
                    <select
                      value={form.billingCycle}
                      onChange={(e) =>
                        updateField(
                          "billingCycle",
                          e.target.value as CorporateForm["billingCycle"]
                        )
                      }
                      className={inputClass}
                    >
                      <option value="PER_TRIP">
                        Per Trip
                      </option>
                      <option value="WEEKLY">
                        Weekly
                      </option>
                      <option value="FORTNIGHTLY">
                        Fortnightly
                      </option>
                      <option value="MONTHLY">
                        Monthly
                      </option>
                    </select>
                  </Field>

                  <Field label="Approval Flow">
                    <select
                      value={form.approvalFlow}
                      onChange={(e) =>
                        updateField(
                          "approvalFlow",
                          e.target.value as CorporateForm["approvalFlow"]
                        )
                      }
                      className={inputClass}
                    >
                      <option value="NONE">
                        None
                      </option>
                      <option value="MANAGER">
                        Manager
                      </option>
                      <option value="MANAGER_FINANCE">
                        Manager + Finance
                      </option>
                      <option value="CUSTOM">
                        Custom
                      </option>
                    </select>
                  </Field>

                  <Field label="Credit Limit">
                    <input
                      type="number"
                      min="0"
                      value={form.creditLimit}
                      onChange={(e) =>
                        updateField(
                          "creditLimit",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Payment Terms (Days)">
                    <input
                      type="number"
                      min="0"
                      value={form.paymentTermsDays}
                      onChange={(e) =>
                        updateField(
                          "paymentTermsDays",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </Section>

                <div className="flex justify-end gap-3 border-t pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={saving}
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : selected
                        ? "Update Corporate"
                        : "Create Corporate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";