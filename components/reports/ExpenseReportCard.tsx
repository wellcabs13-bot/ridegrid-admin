'use client';

import { expenseReport } from '@/data/reports';

export default function ExpenseReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Expense Report</h2>

          <p className="mt-1 text-sm text-slate-500">
            Business operating expense breakdown
          </p>
        </div>

        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
          View Details
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <h3 className="mt-2 text-3xl font-bold text-red-600">
            {expenseReport.totalExpenses}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Fuel Expenses</p>
          <h3 className="mt-2 text-3xl font-bold text-orange-600">
            {expenseReport.fuel}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Staff Salaries</p>
          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {expenseReport.salaries}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Operations</p>
          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {expenseReport.operations}
          </h3>
        </div>
      </div>
    </div>
  );
}
