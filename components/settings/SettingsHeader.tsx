'use client';

export default function SettingsHeader() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>

          <p className="mt-2 text-sm text-slate-500">
            Configure RideGrid platform settings, business rules, integrations
            and system preferences.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-100">
            Reset
          </button>

          <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
