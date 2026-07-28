'use client';

import { vehicleReport } from '@/data/reports';

export default function VehicleReportCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Vehicle Report</h2>

            <p className="mt-1 text-sm text-slate-500">
              Fleet utilization and vehicle availability
            </p>
          </div>

          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
            View Details
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Vehicles</p>
          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {vehicleReport.totalVehicles.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Active Vehicles</p>
          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {vehicleReport.activeVehicles.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Maintenance</p>
          <h3 className="mt-2 text-3xl font-bold text-amber-600">
            {vehicleReport.maintenance.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Inactive</p>
          <h3 className="mt-2 text-3xl font-bold text-red-600">
            {vehicleReport.inactive.toLocaleString()}
          </h3>
        </div>
      </div>
    </div>
  );
}
