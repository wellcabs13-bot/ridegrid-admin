'use client';

import { Driver } from '../../data/drivers';
import DriverRow from './DriverRow';

interface DriverTableProps {
  drivers: Driver[];
  onView: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

export default function DriverTable({
  drivers,
  onView,
  onEdit,
  onDelete,
}: DriverTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Driver List
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Showing {drivers.length} driver(s)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Driver
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Vehicle
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Availability
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Status
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Trips
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Rating
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                Earnings
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {drivers.length > 0 ? (
              drivers.map((driver) => (
                <DriverRow
                  key={driver.id}
                  driver={driver}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No drivers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
