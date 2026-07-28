'use client';

import { fareSettings } from '@/data/settings';

export default function FareSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Fare Configuration
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure default pricing rules for RideGrid.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Save Fare
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Base Fare (₹)
          </label>

          <input
            type="number"
            defaultValue={fareSettings.baseFare}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Per KM Charge (₹)
          </label>

          <input
            type="number"
            defaultValue={fareSettings.perKm}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Waiting Charge / Minute (₹)
          </label>

          <input
            type="number"
            defaultValue={fareSettings.waiting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
