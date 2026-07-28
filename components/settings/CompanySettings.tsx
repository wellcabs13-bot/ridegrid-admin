'use client';

import { companyInfo } from '@/data/settings';

export default function CompanySettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Company Information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage your business information displayed across RideGrid.
        </p>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Company Name</label>

          <input
            defaultValue={companyInfo.companyName}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Website</label>

          <input
            defaultValue={companyInfo.website}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Email</label>

          <input
            defaultValue={companyInfo.email}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Phone</label>

          <input
            defaultValue={companyInfo.phone}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Address</label>

          <input
            defaultValue={companyInfo.address}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Time Zone</label>

          <input
            defaultValue={companyInfo.timezone}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
