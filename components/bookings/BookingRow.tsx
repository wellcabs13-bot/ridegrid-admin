'use client';

import {
  CalendarDays,
  CarFront,
  Eye,
  MapPin,
  User,
} from 'lucide-react';

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

export default function BookingRow({
  booking,
  onView,
}: BookingRowProps) {
  return (
    <tr className="group border-b border-slate-100 transition-all hover:bg-slate-50">
      {/* Booking ID */}

      <td className="whitespace-nowrap px-6 py-5">
        <div>
          <p className="font-semibold text-slate-900">
            {booking.id}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            RideGrid Booking
          </p>
        </div>
      </td>

      {/* Customer */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
            {booking.customer.charAt(0).toUpperCase()}
          </div>

          <div>
            <p className="font-medium text-slate-900">
              {booking.customer}
            </p>

            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <User size={13} />
              Customer
            </div>
          </div>
        </div>
      </td>

      {/* Vehicle */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <CarFront
            size={16}
            className="text-slate-400"
          />

          <span className="font-medium text-slate-700">
            {booking.vehicle}
          </span>
        </div>
      </td>

      {/* Pickup */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <MapPin
            size={15}
            className="text-green-600"
          />

          <span className="text-slate-700">
            {booking.pickup || '-'}
          </span>
        </div>
      </td>

      {/* Drop */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <MapPin
            size={15}
            className="text-red-600"
          />

          <span className="text-slate-700">
            {booking.drop || '-'}
          </span>
        </div>
      </td>

      {/* Journey Date */}

      <td className="whitespace-nowrap px-6 py-5">
        <div className="flex items-center gap-2">
          <CalendarDays
            size={16}
            className="text-slate-400"
          />

          <span>{booking.date}</span>
        </div>
      </td>

      {/* Amount */}

      <td className="whitespace-nowrap px-6 py-5">
        <span className="text-lg font-bold text-slate-900">
          {booking.amount}
        </span>
      </td>

      {/* Status */}

      <td className="px-6 py-5">
        <StatusBadge status={booking.status} />
      </td>

      {/* Payment */}

      <td className="px-6 py-5">
        <PaymentBadge payment={booking.payment} />
      </td>

      {/* Actions */}

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView?.(booking)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Eye size={15} />
            View
          </button>

          <ActionMenu bookingId={booking.id} />
        </div>
      </td>
    </tr>
  );
}