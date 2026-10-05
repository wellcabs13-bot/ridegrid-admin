'use client';

import { Pill } from '@/components/admin/kit';
import { Driver } from '../../data/drivers';

interface DriverRowProps {
  driver: Driver;
  onView: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

const STATUS_PILL: Record<string, string> = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
  Blocked: 'SUSPENDED',
  Suspended: 'SUSPENDED',
};

export default function DriverRow({
  driver,
  onView,
  onEdit,
  onDelete,
}: DriverRowProps) {
  const status = String(driver.status);

  return (
    <tr className="cursor-pointer" onClick={() => onView(driver)}>
      <td>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
            {(driver.name || '?').slice(0, 1).toUpperCase()}
          </span>

          <div className="min-w-0">
            <p className="truncate font-semibold">{driver.name}</p>

            <p className="truncate text-xs text-neutral-500">
              {driver.mobile || 'No mobile'}
              {driver.email ? ` · ${driver.email}` : ''}
            </p>
          </div>
        </div>
      </td>

      <td>
        <p className="font-medium">{driver.vehicle || 'No vehicle'}</p>

        <p className="text-xs text-neutral-500">{driver.vehicleNumber || '—'}</p>
      </td>

      <td>
        <Pill value={STATUS_PILL[status] ?? 'PENDING'} label={status} />
      </td>

      <td className="text-right">{driver.trips ?? 0}</td>

      <td className="text-right font-semibold">
        ₹{Number(driver.earnings ?? 0).toLocaleString('en-IN')}
      </td>

      <td>
        <div
          className="flex items-center justify-end gap-2 whitespace-nowrap"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => onView(driver)} className="rg-outline">
            View
          </button>

          <button type="button" onClick={() => onEdit(driver)} className="rg-secondary !px-3 !py-1 !text-xs">
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(driver)}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
