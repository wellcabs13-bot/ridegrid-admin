'use client';

import { Driver } from '../../data/drivers';

interface DriverVehicleCardProps {
  driver: Driver;
}

export default function DriverVehicleCard({ driver }: DriverVehicleCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Assigned Vehicle
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Vehicle currently assigned to this driver.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm text-slate-500">Vehicle Name</p>

          <p className="mt-1 font-semibold text-slate-800">{driver.vehicle}</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Vehicle Number</p>

          <p className="mt-1 font-semibold text-slate-800">
            {driver.vehicleNumber}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Availability</p>

          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              driver.availability === 'Available'
                ? 'bg-green-100 text-green-700'
                : driver.availability === 'On Trip'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {driver.availability}
          </span>
        </div>

        <div>
          <p className="text-sm text-slate-500">Driver Status</p>

          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              driver.status === 'Active'
                ? 'bg-green-100 text-green-700'
                : driver.status === 'Inactive'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {driver.status}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Total Trips</p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {driver.trips}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Driver Rating</p>

            <p className="mt-1 text-xl font-bold text-amber-500">
              ⭐ {driver.rating}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Lifetime Earnings</p>

            <p className="mt-1 text-xl font-bold text-green-600">
              ₹{driver.earnings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
