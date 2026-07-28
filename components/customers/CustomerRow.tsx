'use client';

import { Customer } from '../../data/customers';

interface CustomerRowProps {
  customer: Customer;
  onView?: (customer: Customer) => void;
}

export default function CustomerRow({ customer, onView }: CustomerRowProps) {
  return (
    <tr className="border-b transition hover:bg-slate-50">
      <td className="px-4 py-4 font-semibold">{customer.id}</td>

      <td className="px-4 py-4">{customer.name}</td>

      <td className="px-4 py-4">{customer.mobile}</td>

      <td className="px-4 py-4">{customer.email}</td>

      <td className="px-4 py-4">{customer.city}</td>

      <td className="px-4 py-4 text-center">{customer.totalBookings}</td>

      <td className="px-4 py-4 font-semibold">{customer.totalSpent}</td>

      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            customer.status === 'Active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {customer.status}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => onView?.(customer)}
            className="rounded-lg border border-blue-500 px-3 py-1 text-blue-600 hover:bg-blue-50"
          >
            View
          </button>

          <button className="rounded-lg bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
            Edit
          </button>

          <button className="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
