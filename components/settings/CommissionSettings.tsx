'use client';

import { commissionSettings } from '@/data/settings';

export default function CommissionSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Commission Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure revenue sharing between RideGrid and vendors.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Update
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Platform Commission
          </label>

          <input
            defaultValue={commissionSettings.platformCommission}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Vendor Commission
          </label>

          <input
            defaultValue={commissionSettings.vendorCommission}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2 rounded-xl bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">
              Total Distribution
            </span>

            <span className="text-lg font-bold text-green-600">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
