'use client';

import { Customer } from '../../data/customers';

interface CustomerBookingHistoryProps {
  customer: Customer;
}

export default function CustomerBookingHistory({
  customer,
}: CustomerBookingHistoryProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold">Booking History</h3>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {customer.totalBookings} Trips
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Booking ID</th>

              <th className="px-4 py-3 text-left">Vehicle</th>

              <th className="px-4 py-3 text-left">Driver</th>

              <th className="px-4 py-3 text-left">Amount</th>

              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {[1, 2, 3].map((item) => (
              <tr key={item} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">BKG100{item}</td>

                <td className="px-4 py-3">{customer.preferredVehicle}</td>

                <td className="px-4 py-3">{customer.preferredDriver}</td>

                <td className="px-4 py-3">
                  ₹{(2500 + item * 1200).toLocaleString('en-IN')}
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        Showing recent bookings for this customer. Later this section can be
        connected to the actual Booking module and display real booking records
        automatically.
      </div>
    </div>
  );
}
