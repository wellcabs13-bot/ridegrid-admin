'use client';

import { reportChart } from '@/data/reports';

export default function ReportCharts() {
  const maxValue = Math.max(...reportChart.map((item) => item.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Report Growth</h2>

        <p className="mt-1 text-sm text-slate-500">
          Monthly business reporting trend
        </p>
      </div>

      <div className="flex h-80 items-end justify-between gap-4 p-6">
        {reportChart.map((item) => {
          const height = (item.value / maxValue) * 220;

          return (
            <div
              key={item.month}
              className="flex flex-1 flex-col items-center justify-end"
            >
              <div
                className="flex w-full items-end justify-center rounded-t-xl bg-indigo-600 transition-all hover:bg-indigo-700"
                style={{
                  height: `${height}px`,
                  minHeight: '30px',
                }}
              >
                <span className="mb-2 text-xs font-semibold text-white">
                  {item.value}
                </span>
              </div>

              <span className="mt-3 text-sm font-medium text-slate-600">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
