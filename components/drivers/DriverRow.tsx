'use client';

import Image from 'next/image';
import { Driver } from '../../data/drivers';

interface DriverRowProps {
  driver: Driver;
  onView: (driver: Driver) => void;
}

export default function DriverRow({
  driver,
  onView,
}: DriverRowProps) {
  return (
    <tr className="border-b border-slate-200 transition hover:bg-slate-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border">
            <Image
              src={driver.photo}
              alt={driver.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>

          <div>
            <h3 className="font-semibold text-slate-800">
              {driver.name}
            </h3>

            <p className="text-sm text-slate-500">
              {driver.mobile}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-slate-700">
            {driver.vehicle}
          </p>

          <p className="text-sm text-slate-500">
            {driver.vehicleNumber}
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
              : driver.status === 'Inactive'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {driver.status}
        </span>
      </td>

      <td className="px-6 py-4 text-slate-700">
        {driver.trips}
      </td>

      <td className="px-6 py-4 text-slate-700">
        ⭐ {driver.rating}
      </td>

      <td className="px-6 py-4 text-slate-700">
        ₹{driver.earnings.toLocaleString()}
      </td>

      <td className="px-6 py-4">
        <button
          onClick={() => onView(driver)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          View
        </button>
      </td>
    </tr>
  );
}