'use client';

import { Vendor } from '../../data/vendors';

interface VendorPerformanceCardProps {
  vendor: Vendor;
}

export default function VendorPerformanceCard({
  vendor,
}: VendorPerformanceCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Performance</h3>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Completed Trips</p>

          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {vendor.completedTrips}
          </h2>
        </div>

        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Rating</p>

          <h2 className="mt-2 text-3xl font-bold text-green-700">
            ⭐ {vendor.rating}
          </h2>
        </div>

        <div className="rounded-xl bg-purple-50 p-5">
          <p className="text-sm text-slate-500">Fleet Size</p>

          <h2 className="mt-2 text-3xl font-bold text-purple-700">
            {vendor.totalVehicles}
          </h2>
        </div>

        <div className="rounded-xl bg-orange-50 p-5">
          <p className="text-sm text-slate-500">Active Fleet</p>

          <h2 className="mt-2 text-3xl font-bold text-orange-700">
            {vendor.activeVehicles}
          </h2>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between">
          <span className="text-sm">Vendor Score</span>

          <span className="font-semibold">
            {Math.round(vendor.rating * 20)}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-green-500"
            style={{
              width: `${Math.round(vendor.rating * 20)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
