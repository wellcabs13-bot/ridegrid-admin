'use client';

import { performanceReport } from '@/data/reports';

export default function PerformanceReport() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Overall Performance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Business KPI performance score
        </p>
      </div>

      <div className="space-y-6 p-6">
        {performanceReport.map((item) => (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-slate-700">{item.name}</span>

              <span className="font-semibold text-indigo-600">
                {item.score}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
