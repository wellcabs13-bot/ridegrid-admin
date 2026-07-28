'use client';

import { Vehicle } from '../../data/vehicles';

interface VehicleOwnerCardProps {
  vehicle: Vehicle;
}

export default function VehicleOwnerCard({ vehicle }: VehicleOwnerCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Owner / Assignment</h3>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <p className="text-xs uppercase text-slate-500">Vendor</p>

          <h4 className="mt-2 text-lg font-semibold">{vehicle.vendorName}</h4>

          <p className="mt-3 text-sm text-slate-500">Assigned Fleet Owner</p>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-xs uppercase text-slate-500">Driver</p>

          <h4 className="mt-2 text-lg font-semibold">{vehicle.driverName}</h4>

          <p className="mt-3 text-sm text-slate-500">Current Assigned Driver</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-slate-500">Total Trips</p>

          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {vehicle.totalTrips}
          </h2>
        </div>

        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-slate-500">Earnings</p>

          <h2 className="mt-2 text-2xl font-bold text-green-700">
            {vehicle.earnings}
          </h2>
        </div>

        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-sm text-slate-500">Availability</p>

          <h2 className="mt-2 text-xl font-bold text-purple-700">
            {vehicle.availability}
          </h2>
        </div>
      </div>
    </div>
  );
}
