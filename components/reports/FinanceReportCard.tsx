'use client';

import { financeReport } from '@/data/reports';

export default function FinanceReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Finance Report</h2>

            <p className="mt-1 text-sm text-slate-500">
              Revenue, expenses and profit overview
            </p>
          </div>

          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
            View Details
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Revenue</p>
          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {financeReport.revenue}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Expenses</p>
          <h3 className="mt-2 text-3xl font-bold text-red-600">
            {financeReport.expenses}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Net Profit</p>
          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {financeReport.profit}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Profit Margin</p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-600">
            {financeReport.margin}
          </h3>
        </div>
      </div>
    </div>
  );
}
