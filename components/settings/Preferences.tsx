'use client';

import { preferences } from '@/data/settings';

export default function Preferences() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">System Preferences</h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure default platform preferences.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Language</label>

          <input
            value={preferences.language}
            readOnly
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Theme</label>

          <input
            value={preferences.theme}
            readOnly
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Time Zone</label>

          <input
            value={preferences.timezone}
            readOnly
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Date Format</label>

          <input
            value={preferences.dateFormat}
            readOnly
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Currency</label>

          <input
            value={preferences.currency}
            readOnly
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>
      </div>
    </div>
  );
}
