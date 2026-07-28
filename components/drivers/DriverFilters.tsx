'use client';

interface DriverFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}

export default function DriverFilters({
  search,
  setSearch,
  status,
  setStatus,
}: DriverFiltersProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Search Driver
          </label>

          <input
            type="text"
            placeholder="Name, Mobile, Vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Status
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          >
            <option value="All">All Drivers</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setSearch('');
              setStatus('All');
            }}
            className="w-full rounded-xl border border-slate-300 px-5 py-3 font-medium transition hover:bg-slate-100"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
