'use client';

import {
  RotateCcw,
  Search,
  Filter,
  BadgeCheck,
  CreditCard,
} from 'lucide-react';

interface BookingFiltersProps {
  search: string;
  status: string;
  payment: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPaymentChange: (value: string) => void;
  onReset: () => void;
}

export default function BookingFilters({
  search,
  status,
  payment,
  onSearchChange,
  onStatusChange,
  onPaymentChange,
  onReset,
}: BookingFiltersProps) {
  return (
    <div className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
            <Filter className="h-5 w-5 text-blue-600" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Booking Filters
            </h3>

            <p className="text-sm text-slate-500">
              Search and filter bookings quickly
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-3">
        {/* Search */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Search size={16} />
            Search
          </label>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Booking ID, Customer..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            <BadgeCheck size={16} />
            Booking Status
          </label>

          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Status</option>
            <option value="Running">Running</option>
            <option value="Completed">Completed</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Payment */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            <CreditCard size={16} />
            Payment Status
          </label>

          <select
            value={payment}
            onChange={(e) => onPaymentChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>
    </div>
  );
}