'use client';

interface ReportsFiltersProps {
  dateRange: string;
  setDateRange: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  format: string;
  setFormat: (value: string) => void;
}

export default function ReportsFilters({
  dateRange,
  setDateRange,
  category,
  setCategory,
  format,
  setFormat,
}: ReportsFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
        >
          <option>Today</option>
          <option>Yesterday</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 3 Months</option>
          <option>Last Year</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
        >
          <option>All Categories</option>
          <option>Revenue</option>
          <option>Bookings</option>
          <option>Customers</option>
          <option>Drivers</option>
          <option>Vehicles</option>
          <option>Finance</option>
        </select>

        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
        >
          <option>All Formats</option>
          <option>PDF</option>
          <option>Excel</option>
          <option>CSV</option>
        </select>

        <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">
          Apply Filters
        </button>
      </div>
    </div>
  );
}
