"use client";

import { useEffect, useState } from "react";

export type VendorStatus =
  | "Active"
  | "Suspended"
  | "Inactive"
  | "Pending";

export interface VendorFormData {
  companyName: string;
  ownerName: string;
  mobile: string;
  email: string;
  city: string;
  status: VendorStatus;
}

interface VendorFormProps {
  initialData?: Partial<VendorFormData>;
  onSave: (vendor: VendorFormData) => void;
  onCancel: () => void;
  saving?: boolean;
}

const emptyForm: VendorFormData = {
  companyName: "",
  ownerName: "",
  mobile: "",
  email: "",
  city: "",
  status: "Pending",
};

export default function VendorForm({
  initialData,
  onSave,
  onCancel,
  saving = false,
}: VendorFormProps) {
  const [form, setForm] =
    useState<VendorFormData>(emptyForm);

  useEffect(() => {
    setForm({
      companyName: initialData?.companyName || "",
      ownerName: initialData?.ownerName || "",
      mobile: initialData?.mobile || "",
      email: initialData?.email || "",
      city: initialData?.city || "",
      status: initialData?.status || "Pending",
    });
  }, [initialData]);

  function updateField(
    field: keyof VendorFormData,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !form.companyName.trim() ||
      !form.ownerName.trim() ||
      !form.mobile.trim() ||
      !form.email.trim() ||
      !form.city.trim()
    ) {
      alert("Please fill all fields.");
      return;
    }

    onSave(form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Company Name
          </label>

          <input
            value={form.companyName}
            onChange={(e) =>
              updateField(
                "companyName",
                e.target.value
              )
            }
            placeholder="Company Name"
            disabled={saving}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Owner Name
          </label>

          <input
            value={form.ownerName}
            onChange={(e) =>
              updateField(
                "ownerName",
                e.target.value
              )
            }
            placeholder="Owner Name"
            disabled={saving}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Mobile Number
          </label>

          <input
            value={form.mobile}
            onChange={(e) =>
              updateField(
                "mobile",
                e.target.value
              )
            }
            placeholder="+91 9876543210"
            disabled={saving}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Email Address
          </label>

          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              updateField(
                "email",
                e.target.value
              )
            }
            placeholder="vendor@email.com"
            disabled={saving}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            City
          </label>

          <input
            value={form.city}
            onChange={(e) =>
              updateField(
                "city",
                e.target.value
              )
            }
            placeholder="City"
            disabled={saving}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Vendor Status
          </label>

          <select
            value={form.status}
            onChange={(e) =>
              updateField(
                "status",
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          >
            <option value="Active">
              Active
            </option>

            <option value="Suspended">
              Suspended
            </option>

            <option value="Inactive">
              Inactive
            </option>

            <option value="Pending">
              Pending
            </option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border px-6 py-3 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Vendor"}
        </button>
      </div>
    </form>
  );
}