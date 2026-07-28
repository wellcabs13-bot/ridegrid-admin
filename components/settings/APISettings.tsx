'use client';

import { apiKeys } from '@/data/settings';

export default function APISettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">API Settings</h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure third-party integrations and API credentials.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 transition">
          Generate New Keys
        </button>
      </div>

      <div className="grid gap-6 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Public API Key
          </label>

          <input
            readOnly
            value={apiKeys.publicKey}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Secret API Key
          </label>

          <input
            readOnly
            type="password"
            value={apiKeys.secretKey}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-semibold text-amber-700">
            Security Recommendation
          </h4>

          <p className="mt-2 text-sm text-amber-600">
            Never expose your Secret API Key publicly. Store it securely on your
            backend server.
          </p>
        </div>
      </div>
    </div>
  );
}
