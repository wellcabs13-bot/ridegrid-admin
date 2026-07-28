'use client';

import { Customer } from '../../data/customers';

interface CustomerRevenueCardProps {
  customer: Customer;
}

export default function CustomerRevenueCard({
  customer,
}: CustomerRevenueCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold">Revenue Summary</h3>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-lg bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Total Bookings</p>

          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {customer.totalBookings}
          </h2>
        </div>

        <div className="rounded-lg bg-green-50 p-5">
          <p className="text-sm text-slate-500">Total Revenue</p>

          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {customer.totalSpent}
          </h2>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div>
          <p className="text-xs uppercase text-slate-500">
            Average Per Booking
          </p>

          <p className="mt-1 text-lg font-semibold">
            {customer.totalBookings > 0
              ? `₹${Math.round(
                  Number(customer.totalSpent.replace(/[₹,]/g, '')) /
                    customer.totalBookings
                ).toLocaleString('en-IN')}`
              : '₹0'}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Status</p>

          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              customer.status === 'Active'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {customer.status}
          </span>
        </div>
      </div>
    </div>
  );
}
