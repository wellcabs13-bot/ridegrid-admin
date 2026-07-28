'use client';

import StatusBadge from './StatusBadge';
import PaymentBadge from './PaymentBadge';
import ActionMenu from './ActionMenu';

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

interface BookingRowProps {
  booking: Booking;
  onView?: (booking: Booking) => void;
}

export default function BookingRow({ booking, onView }: BookingRowProps) {
  return (
    <tr className="border-b hover:bg-slate-50 transition">
      <td className="px-4 py-4 font-semibold">{booking.id}</td>

      <td className="px-4 py-4">{booking.customer}</td>

      <td className="px-4 py-4">{booking.vehicle}</td>

      <td className="px-4 py-4">{booking.pickup || '-'}</td>

      <td className="px-4 py-4">{booking.drop || '-'}</td>

      <td className="px-4 py-4">{booking.date}</td>

      <td className="px-4 py-4 font-semibold">{booking.amount}</td>

      <td className="px-4 py-4">
        <StatusBadge status={booking.status} />
      </td>

      <td className="px-4 py-4">
        <PaymentBadge payment={booking.payment} />
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView?.(booking)}
            className="rounded-lg border border-blue-500 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
          >
            View
          </button>

          <ActionMenu booking={booking} />
        </div>
      </td>
    </tr>
  );
}
