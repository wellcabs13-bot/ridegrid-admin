'use client';

import { ListFilter } from 'lucide-react';
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

export default function BookingTable({
  bookings,
  onView,
}: BookingTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Bookings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <ListFilter size={16} />
          Columns
        </button>
      </div>

      {/* Table */}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Booking ID
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customer
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Vehicle
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pickup
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Drop
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Journey Date
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment
              </th>

              <th className="whitespace-nowrap px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onView={onView}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-16 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-3 rounded-full bg-slate-100 p-5">
                      📅
                    </div>

                    <h3 className="text-lg font-semibold text-slate-800">
                      No Bookings Found
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Try changing your filters or create a new booking.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
        <p className="text-sm text-slate-500">
          Total Records:{" "}
          <span className="font-semibold text-slate-800">
            {bookings.length}
          </span>
        </p>

        <p className="text-sm text-slate-500">
          Pagination will be enabled with backend integration.
        </p>
      </div>
    </div>
  );
}