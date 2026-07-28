'use client';

import CustomerRow from './CustomerRow';
import { Customer } from '../../data/customers';

interface CustomerTableProps {
  customers: Customer[];
  onView?: (customer: Customer) => void;
}

export default function CustomerTable({
  customers,
  onView,
}: CustomerTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Customer ID</th>

              <th className="px-4 py-3 text-left">Name</th>

              <th className="px-4 py-3 text-left">Mobile</th>

              <th className="px-4 py-3 text-left">Email</th>

              <th className="px-4 py-3 text-left">City</th>

              <th className="px-4 py-3 text-center">Bookings</th>

              <th className="px-4 py-3 text-left">Revenue</th>

              <th className="px-4 py-3 text-left">Status</th>

              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onView={onView}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
