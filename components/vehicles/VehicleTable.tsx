'use client';

import { Vehicle } from '../../data/vehicles';
import VehicleRow from './VehicleRow';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView?: (vehicle: Vehicle) => void;
}

export default function VehicleTable({ vehicles, onView }: VehicleTableProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th className="px-4 py-4">Registration</th>

              <th className="px-4 py-4">Vehicle</th>

              <th className="px-4 py-4">Vendor</th>

              <th className="px-4 py-4">Driver</th>

              <th className="px-4 py-4">City</th>

              <th className="px-4 py-4 text-center">Trips</th>

              <th className="px-4 py-4">Revenue</th>

              <th className="px-4 py-4">Insurance</th>

              <th className="px-4 py-4">Status</th>

              <th className="px-4 py-4">Availability</th>

              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  onView={onView}
                />
              ))
            ) : (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  No vehicles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
