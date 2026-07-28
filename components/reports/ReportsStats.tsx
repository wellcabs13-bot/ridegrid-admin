'use client';

import { reportStats } from '@/data/reports';

export default function ReportsStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {reportStats.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <p className="text-sm font-medium text-slate-500">{item.title}</p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {item.value}
          </h2>

          <div className="mt-4 flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                item.trend === 'up'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {item.change}
            </span>

            <span className="text-sm text-slate-400">vs last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}
