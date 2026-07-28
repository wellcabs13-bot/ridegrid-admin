'use client';

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
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search Booking ID or Customer..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="border rounded-xl px-4 py-3"
        >
          <option value="">All Status</option>
          <option value="Running">Running</option>
          <option value="Completed">Completed</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={payment}
          onChange={(e) => onPaymentChange(e.target.value)}
          className="border rounded-xl px-4 py-3"
        >
          <option value="">All Payments</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
        </select>

        <button
          onClick={onReset}
          className="bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
