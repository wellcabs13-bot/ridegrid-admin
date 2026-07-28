'use client';

import { Driver } from '../../data/drivers';

interface DriverAttendanceCardProps {
  driver: Driver;
}

export default function DriverAttendanceCard({
  driver,
}: DriverAttendanceCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Attendance Summary
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Monthly attendance and availability report.
        </p>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Present Days</p>

          <h2 className="mt-2 text-3xl font-bold text-green-700">26</h2>
        </div>

        <div className="rounded-xl bg-red-50 p-5">
          <p className="text-sm text-slate-500">Absent Days</p>

          <h2 className="mt-2 text-3xl font-bold text-red-600">2</h2>
        </div>

        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Working Hours</p>

          <h2 className="mt-2 text-3xl font-bold text-blue-700">218</h2>
        </div>

        <div className="rounded-xl bg-amber-50 p-5">
          <p className="text-sm text-slate-500">Attendance</p>

          <h2 className="mt-2 text-3xl font-bold text-amber-600">93%</h2>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Driver</p>

            <p className="mt-1 font-semibold text-slate-900">{driver.name}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Current Status</p>

            <p className="mt-1 font-semibold text-slate-900">{driver.status}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Availability</p>

            <p className="mt-1 font-semibold text-slate-900">
              {driver.availability}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
