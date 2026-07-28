'use client';

import {
  reportStats,
  financeReport,
  bookingReport,
  customerReport,
} from '@/data/reports';

export default function ReportSummary() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Executive Summary</h2>

        <p className="mt-1 text-sm text-slate-500">
          Overall business performance snapshot
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-xl bg-indigo-50 p-5">
          <h3 className="font-semibold text-slate-900">Platform Performance</h3>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            RideGrid generated
            <span className="font-semibold text-slate-900">
              {' '}
              {financeReport.revenue}
            </span>{' '}
            in total revenue while processing
            <span className="font-semibold text-slate-900">
              {' '}
              {bookingReport.totalBookings.toLocaleString()}
            </span>{' '}
            bookings and serving
            <span className="font-semibold text-slate-900">
              {' '}
              {customerReport.totalCustomers.toLocaleString()}
            </span>{' '}
            customers.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {reportStats.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="text-xs text-slate-500">{item.title}</p>

              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                {item.value}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
