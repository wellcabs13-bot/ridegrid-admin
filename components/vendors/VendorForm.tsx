'use client';

import { useState } from 'react';

export interface VendorFormData {
  companyName: string;
  ownerName: string;
  mobile: string;
  email: string;
  city: string;
}

interface VendorFormProps {
  onSave: (vendor: VendorFormData) => void;
  onCancel: () => void;
}

export default function VendorForm({ onSave, onCancel }: VendorFormProps) {
  const [form, setForm] = useState<VendorFormData>({
    companyName: '',
    ownerName: '',
    mobile: '',
    email: '',
    city: '',
  });

  function updateField(field: keyof VendorFormData, value: string) {
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
      !form.city.trim()
    ) {
      alert('Please fill all fields.');
      return;
    }

    onSave(form);

    setForm({
      companyName: '',
      ownerName: '',
      mobile: '',
      email: '',
      city: '',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Company Name
          </label>

          <input
            value={form.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            placeholder="Company Name"
            className="w-full rounded-lg border px-4 py-3 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Owner Name</label>

          <input
            value={form.ownerName}
            onChange={(e) => updateField('ownerName', e.target.value)}
            placeholder="Owner Name"
            className="w-full rounded-lg border px-4 py-3 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Mobile Number
          </label>

          <input
            value={form.mobile}
            onChange={(e) => updateField('mobile', e.target.value)}
            placeholder="+91 9876543210"
            className="w-full rounded-lg border px-4 py-3 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Email Address
          </label>

          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="vendor@email.com"
            className="w-full rounded-lg border px-4 py-3 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold">City</label>

          <input
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="City"
            className="w-full rounded-lg border px-4 py-3 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-6 py-3 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Save Vendor
        </button>
      </div>
    </form>
  );
}
