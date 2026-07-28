'use client';

import { securitySettings } from '@/data/settings';

export default function SecuritySettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Security Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure authentication and platform security.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Save Security
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-900">
              Two-Factor Authentication
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Require administrators to verify using OTP.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              defaultChecked={securitySettings.twoFactor}
              className="peer sr-only"
            />

            <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Session Timeout (Minutes)
          </label>

          <input
            type="number"
            defaultValue={securitySettings.sessionTimeout}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h4 className="font-semibold text-amber-700">
            Security Recommendation
          </h4>

          <p className="mt-2 text-sm text-amber-600">
            Enable Two-Factor Authentication and keep session timeout below 30
            minutes for better platform security.
          </p>
        </div>
      </div>
    </div>
  );
}
