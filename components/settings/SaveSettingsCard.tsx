'use client';

export default function SaveSettingsCard() {
  return (
    <div className="sticky bottom-6 z-50 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Save Settings</h2>

          <p className="mt-2 text-sm text-indigo-100">
            Review your configuration before saving. Changes will be applied
            across the RideGrid platform.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Reset
          </button>

          <button
            type="button"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:bg-slate-100"
          >
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
}
