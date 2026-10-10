"use client";

import { Customer } from "@/types/customer-ui";
import CustomerRow from "./CustomerRow";

interface Props {
  customers: Customer[];
  onView: (customer: Customer) => void;
}

export default function CustomerTable({
  customers,
  onView,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Customer
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Mobile
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Bookings
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Revenue
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>

              <th className="px-4 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  onView={onView}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}