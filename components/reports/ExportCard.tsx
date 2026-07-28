'use client';

import { exportOptions } from '@/data/reports';

export default function ExportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Export Reports</h2>

        <p className="mt-1 text-sm text-slate-500">
          Download reports in multiple formats
        </p>
      </div>

      <div className="space-y-4 p-6">
        {exportOptions.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{item.name}</h3>

              <p className="text-sm text-slate-500">
                Export report in {item.icon.toUpperCase()} format
              </p>
            </div>

            <button className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">
              Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
