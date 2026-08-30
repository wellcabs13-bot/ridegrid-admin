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
  homeCity: string;
  fleetSize: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  aadhaarCard: File | null;
  panCard: File | null;
  cancelledCheque: File | null;
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
  homeCity: "",
  fleetSize: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  aadhaarCard: null,
  panCard: null,
  cancelledCheque: null,
  status: "Pending",
};

export default function VendorForm({
  initialData,
  onSave,
  onCancel,
  saving = false,
}: VendorFormProps) {
  const [form, setForm] = useState<VendorFormData>(emptyForm);

  useEffect(() => {
    setForm({
      ...emptyForm,
      ...initialData,
      aadhaarCard: initialData?.aadhaarCard ?? null,
      panCard: initialData?.panCard ?? null,
      cancelledCheque: initialData?.cancelledCheque ?? null,
    });
  }, [initialData]);

  function updateField<K extends keyof VendorFormData>(
    field: K,
    value: VendorFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !form.companyName.trim() ||
      !form.ownerName.trim() ||
      !form.mobile.trim() ||
      !form.email.trim() ||
      !form.homeCity.trim() ||
      !form.fleetSize.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pinCode.trim() ||
      !form.bankName.trim() ||
      !form.accountNumber.trim() ||
      !form.ifscCode.trim() ||
      !form.branchName.trim()
    ) {
      alert("Please fill all required vendor details.");
      return;
    }

    onSave(form);
  }

  const inputClass =
    "w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100";

  const labelClass = "mb-2 block text-sm font-semibold";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* VENDOR DETAILS */}
      <section>
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Vendor Details
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Enter the vendor&apos;s basic and business information.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <label className={labelClass}>Company Name *</label>
            <input
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="Company Name"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Owner Name *</label>
            <input
              value={form.ownerName}
              onChange={(e) => updateField("ownerName", e.target.value)}
              placeholder="Owner Name"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Mobile Number *</label>
            <input
              value={form.mobile}
              onChange={(e) => updateField("mobile", e.target.value)}
              placeholder="+91 9876543210"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email ID *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="vendor@email.com"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Home City *</label>
            <input
              value={form.homeCity}
              onChange={(e) => updateField("homeCity", e.target.value)}
              placeholder="Pune"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Fleet Size *</label>
            <input
              type="number"
              min="0"
              value={form.fleetSize}
              onChange={(e) => updateField("fleetSize", e.target.value)}
              placeholder="Number of vehicles"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Address *</label>
            <textarea
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Full address"
              rows={3}
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>City *</label>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="City"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>State *</label>
            <input
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder="Maharashtra"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>PIN *</label>
            <input
              value={form.pinCode}
              onChange={(e) => updateField("pinCode", e.target.value)}
              placeholder="411001"
              maxLength={6}
              disabled={saving}
              className={inputClass}
            />
          </div>

        </div>
      </section>

      {/* BANK DETAILS */}
      <section className="border-t pt-7">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Bank Details
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Enter the vendor&apos;s settlement bank information.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <label className={labelClass}>Bank Name *</label>
            <input
              value={form.bankName}
              onChange={(e) => updateField("bankName", e.target.value)}
              placeholder="Bank Name"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Account Number *</label>
            <input
              value={form.accountNumber}
              onChange={(e) =>
                updateField("accountNumber", e.target.value)
              }
              placeholder="Account Number"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>IFSC Code *</label>
            <input
              value={form.ifscCode}
              onChange={(e) => updateField("ifscCode", e.target.value)}
              placeholder="IFSC Code"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Branch Name *</label>
            <input
              value={form.branchName}
              onChange={(e) => updateField("branchName", e.target.value)}
              placeholder="Branch Name"
              disabled={saving}
              className={inputClass}
            />
          </div>

        </div>
      </section>

      {/* VENDOR DOCUMENTS */}
      <section className="border-t pt-7">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Vendor Documents
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload vendor verification documents.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">

          <div>
            <label className={labelClass}>Aadhar Card</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              disabled={saving}
              onChange={(e) =>
                updateField("aadhaarCard", e.target.files?.[0] ?? null)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>PAN Card</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              disabled={saving}
              onChange={(e) =>
                updateField("panCard", e.target.files?.[0] ?? null)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Cancelled Cheque</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              disabled={saving}
              onChange={(e) =>
                updateField(
                  "cancelledCheque",
                  e.target.files?.[0] ?? null
                )
              }
              className={inputClass}
            />
          </div>

        </div>
      </section>

      {/* STATUS */}
      <section className="border-t pt-7">
        <div className="max-w-md">
          <label className={labelClass}>Vendor Status</label>

          <select
            value={form.status}
            onChange={(e) =>
              updateField("status", e.target.value as VendorStatus)
            }
            disabled={saving}
            className={`${inputClass} bg-white`}
          >
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </section>

      {/* ACTIONS */}
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

