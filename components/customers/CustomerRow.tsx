"use client";

import { Customer } from "@/types/customer-ui";

interface Props {
  customer: Customer;
  onView: (customer: Customer) => void;
}

export default function CustomerRow({
  customer,
  onView,
}: Props) {
  return (
    <tr className="border-t hover:bg-slate-50">
      <td className="px-4 py-4">
        <div>
          <p className="font-semibold text-slate-800">
            {customer.name}
          </p>
          <p className="text-xs text-slate-500">
            {customer.email}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        {customer.mobile}
      </td>

      <td className="px-4 py-4">
        {customer.totalBookings}
      </td>

      <td className="px-4 py-4 font-semibold">
        {customer.totalSpent}
      </td>

      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            customer.status === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {customer.status}
        </span>
      </td>

      <td className="px-4 py-4 text-right">
        <button
          type="button"
          onClick={() => onView(customer)}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-100"
        >
          View
        </button>
      </td>
    </tr>
  );
}