'use client';

import { useState } from 'react';

interface ExpenseFormProps {
  onSubmit?: (data: ExpenseFormData) => void;
}

export interface ExpenseFormData {
  category: string;
  title: string;
  vendor: string;
  amount: number;
  paymentMethod: string;
  date: string;
  gst: number;
  invoiceNo: string;
  remarks: string;
}

export default function ExpenseForm({ onSubmit }: ExpenseFormProps) {
  const [form, setForm] = useState<ExpenseFormData>({
    category: '',
    title: '',
    vendor: '',
    amount: 0,
    paymentMethod: 'Bank Transfer',
    date: '',
    gst: 18,
    invoiceNo: '',
    remarks: '',
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === 'amount' || name === 'gst' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit?.(form);

    setForm({
      category: '',
      title: '',
      vendor: '',
      amount: 0,
      paymentMethod: 'Bank Transfer',
      date: '',
      gst: 18,
      invoiceNo: '',
      remarks: '',
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Expense Form</h2>

        <p className="mt-1 text-sm text-slate-500">
          Record business expenses quickly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Expense Category
          </label>

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Select Category</option>
            <option>Vendor Payment</option>
            <option>Driver Salary</option>
            <option>Fuel</option>
            <option>Toll</option>
            <option>Office Expense</option>
            <option>Marketing</option>
            <option>Maintenance</option>
            <option>Insurance</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Expense Title
          </label>

          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
            placeholder="Expense title"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Vendor / Payee
          </label>

          <input
            type="text"
            name="vendor"
            value={form.vendor}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
            placeholder="Vendor name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Amount
          </label>

          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Payment Method
          </label>

          <select
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          >
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Wallet</option>
            <option>Cheque</option>
            <option>Credit Card</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Expense Date
          </label>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            GST %
          </label>

          <input
            type="number"
            name="gst"
            value={form.gst}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Invoice Number
          </label>

          <input
            type="text"
            name="invoiceNo"
            value={form.invoiceNo}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
            placeholder="INV-0001"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Remarks
        </label>

        <textarea
          rows={4}
          name="remarks"
          value={form.remarks}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          placeholder="Additional notes..."
        />
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button
          type="reset"
          className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100"
        >
          Reset
        </button>

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Save Expense
        </button>
      </div>
    </form>
  );
}
