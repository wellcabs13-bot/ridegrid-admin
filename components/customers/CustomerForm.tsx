'use client';

import { useState } from 'react';

export interface CustomerFormData {
  name: string;
  mobile: string;
  email: string;
  city: string;
}

interface CustomerFormProps {
  onSave: (customer: CustomerFormData) => void;
  onCancel: () => void;
}

export default function CustomerForm({ onSave, onCancel }: CustomerFormProps) {
  const [form, setForm] = useState<CustomerFormData>({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });

  const updateField = (field: keyof CustomerFormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.mobile.trim() ||
      !form.email.trim() ||
      !form.city.trim()
    ) {
      alert('Please fill all fields.');
      return;
    }

    onSave(form);

    setForm({
      name: '',
      mobile: '',
      email: '',
      city: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Customer Name
          </label>

          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter customer name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Mobile Number
          </label>

          <input
            type="text"
            value={form.mobile}
            onChange={(e) => updateField('mobile', e.target.value)}
            placeholder="+91 9876543210"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email Address
          </label>

          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="customer@email.com"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            City
          </label>

          <input
            type="text"
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="Enter city"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Save Customer
        </button>
      </div>
    </form>
  );
}
