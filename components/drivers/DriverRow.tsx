'use client';

import { Driver } from '../../data/drivers';

interface DriverRowProps {
  driver: Driver;
  onView: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

export default function DriverRow({
  driver,
  onView,
  onEdit,
  onDelete,
}: DriverRowProps) {
  return (
    <tr className="border-b border-slate-200 transition hover:bg-slate-50">
      <td className="px-6 py-4">
        <div>
          <h3 className="font-semibold text-slate-800">
            {driver.name}
          </h3>

          <p className="text-sm text-slate-500">
            {driver.mobile || 'No mobile'}
          </p>

          {driver.email && (
            <p className="text-xs text-slate-400">
              {driver.email}
            </p>
          )}
        </div>
      </td>

      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-slate-700">
            {driver.vehicle || 'No vehicle'}
          </p>

          <p className="text-sm text-slate-500">
            {driver.vehicleNumber || '-'}
          </p>
        </div>
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            driver.availability === 'Available'
              ? 'bg-green-100 text-green-700'
              : driver.availability === 'On Trip'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-200 text-slate-700'
          }`}
        >
          {driver.availability}
        </span>
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            driver.status === 'Active'
              ? 'bg-green-100 text-green-700'
              : false
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {driver.status}
        </span>
      </td>

      <td className="px-6 py-4 text-slate-700">
        {driver.trips ?? 0}
      </td>

      <td className="px-6 py-4 text-slate-700">
        {driver.rating ?? 0}
      </td>

      <td className="px-6 py-4 text-slate-700">
        ₹{Number(driver.earnings ?? 0).toLocaleString()}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onView(driver)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            View
          </button>

          <button
            type="button"
            onClick={() => onEdit(driver)}
            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(driver)}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
