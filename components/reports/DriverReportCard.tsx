'use client';

import { driverReport } from '@/data/reports';

export default function DriverReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Driver Report</h2>

            <p className="mt-1 text-sm text-slate-500">
              Driver availability and performance overview
            </p>
          </div>

          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
            View Details
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Drivers</p>
          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {driverReport.totalDrivers.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Active Drivers</p>
          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {driverReport.activeDrivers.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Online Drivers</p>
          <h3 className="mt-2 text-3xl font-bold text-cyan-600">
            {driverReport.onlineDrivers.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Offline Drivers</p>
          <h3 className="mt-2 text-3xl font-bold text-orange-600">
            {driverReport.offlineDrivers.toLocaleString()}
          </h3>
        </div>
      </div>
    </div>
  );
}
