'use client';

import { commissionReport } from '@/data/reports';

export default function CommissionReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Commission Report
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Vendor and platform commission summary
          </p>
        </div>

        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
          View Details
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Commission</p>

          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {commissionReport.totalCommission}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Vendor Commission</p>

          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {commissionReport.vendorCommission}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Platform Commission</p>

          <h3 className="mt-2 text-3xl font-bold text-orange-600">
            {commissionReport.platformCommission}
          </h3>
        </div>
      </div>
    </div>
  );
}
