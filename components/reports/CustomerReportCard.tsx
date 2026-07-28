'use client';

import { customerReport } from '@/data/reports';

export default function CustomerReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Customer Report
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customer acquisition and retention
            </p>
          </div>

          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
            View Details
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Customers</p>
          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {customerReport.totalCustomers.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Active Customers</p>
          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {customerReport.activeCustomers.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Repeat Customers</p>
          <h3 className="mt-2 text-3xl font-bold text-cyan-600">
            {customerReport.repeatCustomers.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">New Customers</p>
          <h3 className="mt-2 text-3xl font-bold text-orange-600">
            {customerReport.newCustomers.toLocaleString()}
          </h3>
        </div>
      </div>
    </div>
  );
}
