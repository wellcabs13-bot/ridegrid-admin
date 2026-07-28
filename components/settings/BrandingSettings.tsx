'use client';

import { brandingSettings } from '@/data/settings';

export default function BrandingSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Branding Settings</h2>

        <p className="mt-1 text-sm text-slate-500">
          Customize RideGrid branding and application appearance.
        </p>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Application Name
          </label>

          <input
            defaultValue={brandingSettings.appName}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Primary Color
          </label>

          <input
            defaultValue={brandingSettings.primaryColor}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Secondary Color
          </label>

          <input
            defaultValue={brandingSettings.secondaryColor}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Logo URL</label>

          <input
            defaultValue={brandingSettings.logo}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Favicon</label>

          <input
            defaultValue={brandingSettings.favicon}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
