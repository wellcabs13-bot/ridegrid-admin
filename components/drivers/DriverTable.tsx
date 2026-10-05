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
    <section className="rg-card">
      <div className="border-b border-neutral-100 px-5 py-3.5">
        <h2 className="text-[15px] font-bold tracking-tight">Driver list</h2>

        <p className="mt-0.5 text-xs text-neutral-500">
          Showing {drivers.length} driver(s)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="rg-table min-w-[820px]">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Assigned vehicle</th>
              <th>Status</th>
              <th className="text-right">Trips</th>
              <th className="text-right">Earnings</th>
              <th className="text-right">Action</th>
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
                <td colSpan={6} className="!py-12 text-center text-neutral-500">
                  No drivers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
