'use client';

import {
  Plus,
  CalendarDays,
  Download,
  RefreshCw,
} from 'lucide-react';

interface BookingHeaderProps {
  totalBookings: number;
  onAddBooking: () => void;
}

export default function BookingHeader({
  totalBookings,
  onAddBooking,
}: BookingHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      {/* Left */}

      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50">
          <CalendarDays className="h-8 w-8 text-blue-600" />
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Booking Management
          </h1>

          <p className="mt-1 text-slate-500">
            Manage bookings, trips, payments and customer journeys.
          </p>

          <div className="mt-3 inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            Total Bookings :
            <span className="ml-2 font-bold">
              {totalBookings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Right */}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={17} />
          Refresh
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Download size={17} />
          Export
        </button>

        <button
          onClick={onAddBooking}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Booking
        </button>
      </div>
    </div>
  );
}