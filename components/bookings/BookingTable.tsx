'use client';

import BookingRow from './BookingRow';

interface Booking {
  id: string;
  customer: string;
  vehicle: string;
  pickup?: string;
  drop?: string;
  date: string;
  amount: string;
  status: string;
  payment: string;
}

interface BookingTableProps {
  bookings: Booking[];
  onView?: (booking: Booking) => void;
}

export default function BookingTable({ bookings, onView }: BookingTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Booking ID
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Customer
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Vehicle
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Pickup
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Drop
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Journey Date
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Amount
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Status
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Payment
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} onView={onView} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
