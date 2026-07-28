'use client';

import { paymentReport } from '@/data/reports';

export default function PaymentReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Payment Report</h2>

          <p className="mt-1 text-sm text-slate-500">
            Payment success, pending and failed transactions
          </p>
        </div>

        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
          View Details
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Successful Payments</p>

          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {paymentReport.successful.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Pending Payments</p>

          <h3 className="mt-2 text-3xl font-bold text-amber-600">
            {paymentReport.pending.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Failed Payments</p>

          <h3 className="mt-2 text-3xl font-bold text-red-600">
            {paymentReport.failed.toLocaleString()}
          </h3>
        </div>
      </div>
    </div>
  );
}
