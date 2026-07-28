'use client';

import { scheduledReports } from '@/data/reports';

export default function ScheduleReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Scheduled Reports
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Automatically generated reports
          </p>
        </div>

        <button className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          New Schedule
        </button>
      </div>

      <div className="space-y-4 p-6">
        {scheduledReports.map((item) => (
          <div
            key={item.report}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 p-5 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{item.report}</h3>

              <p className="mt-1 text-sm text-slate-500">
                {item.frequency} • Next Run: {item.nextRun}
              </p>
            </div>

            <button className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium hover:bg-slate-100">
              Edit Schedule
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
