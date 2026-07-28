'use client';

import { taxSettings } from '@/data/settings';

export default function TaxGSTSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Tax & GST Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure GST rates and tax deductions.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Save
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            GST Percentage
          </label>

          <input
            defaultValue={taxSettings.gst}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            TDS Percentage
          </label>

          <input
            defaultValue={taxSettings.tds}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            GST and TDS will automatically be applied to bookings, invoices and
            vendor settlements.
          </p>
        </div>
      </div>
    </div>
  );
}
