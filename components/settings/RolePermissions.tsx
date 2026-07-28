'use client';

import { roleStatistics } from '@/data/settings';

export default function RolePermissions() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Role & Permissions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure access levels for every RideGrid team.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Create Role
        </button>
      </div>

      <div className="space-y-4 p-6">
        {roleStatistics.map((role) => (
          <div
            key={role}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-5 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{role}</h3>

              <p className="mt-1 text-sm text-slate-500">
                Manage permissions and module access.
              </p>
            </div>

            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
