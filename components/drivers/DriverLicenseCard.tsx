'use client';

import { Driver } from '../../data/drivers';

interface DriverLicenseCardProps {
  driver: Driver;
}

export default function DriverLicenseCard({ driver }: DriverLicenseCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Driving License
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          License information and verification status.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm text-slate-500">License Number</p>

          <p className="mt-1 font-semibold text-slate-800">
            {driver.licenseNumber}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Expiry Date</p>

          <p className="mt-1 font-semibold text-slate-800">
            {driver.licenseExpiry}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Verification Status</p>

          <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
            Verified
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
            View License
          </button>

          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Download Copy
          </button>
        </div>
      </div>
    </div>
  );
}
