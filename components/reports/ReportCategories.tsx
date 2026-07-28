'use client';

import { reportCategories } from '@/data/reports';

export default function ReportCategories() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-200 px-6 py-5">

        <h2 className="text-xl font-bold text-slate-900">
          Report Categories
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Generate reports for different business operations.
        </p>

      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">

        {reportCategories.map((item) => (

          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 p-5 transition hover:border-indigo-300 hover:shadow-md"
          >

            <div className="flex items-center justify-between">

              <div
                className={`h-4 w-4 rounded-full ${item.color}`}
              />

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {item.reports} Reports
              </span>

            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              {item.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {item.description}
            </p>

            <button className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
              View Report
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}