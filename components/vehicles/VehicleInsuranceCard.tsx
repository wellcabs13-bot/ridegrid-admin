'use client';

import { Vehicle } from '../../data/vehicles';

interface VehicleInsuranceCardProps {
  vehicle: Vehicle;
}

export default function VehicleInsuranceCard({
  vehicle,
}: VehicleInsuranceCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Insurance & Compliance</h3>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border p-5">
          <p className="text-xs uppercase text-slate-500">Insurance Expiry</p>

          <h3 className="mt-2 text-xl font-bold">{vehicle.insuranceExpiry}</h3>

          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
            Active
          </span>
        </div>

        <div className="rounded-lg border p-5">
          <p className="text-xs uppercase text-slate-500">RC Expiry</p>

          <h3 className="mt-2 text-xl font-bold">{vehicle.rcExpiry}</h3>

          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
            Valid
          </span>
        </div>

        <div className="rounded-lg border p-5">
          <p className="text-xs uppercase text-slate-500">Permit Expiry</p>

          <h3 className="mt-2 text-xl font-bold">{vehicle.permitExpiry}</h3>

          <span className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
            Active
          </span>
        </div>

        <div className="rounded-lg border p-5">
          <p className="text-xs uppercase text-slate-500">
            Fitness Certificate
          </p>

          <h3 className="mt-2 text-xl font-bold">{vehicle.fitnessExpiry}</h3>

          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
            Valid
          </span>
        </div>

        <div className="rounded-lg border p-5 md:col-span-2">
          <p className="text-xs uppercase text-slate-500">
            Pollution Certificate
          </p>

          <h3 className="mt-2 text-xl font-bold">{vehicle.pollutionExpiry}</h3>

          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
            Updated
          </span>
        </div>
      </div>
    </div>
  );
}
