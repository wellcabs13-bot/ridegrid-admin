'use client';

interface FinanceFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}

export default function FinanceFilters({
  search,
  setSearch,
  type,
  setType,
  status,
  setStatus,
}: FinanceFiltersProps) {
  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="text"
          placeholder="Search transaction..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
        >
          <option value="All">All Types</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
          <option value="Vendor Payment">Vendor Payment</option>
          <option value="Driver Salary">Driver Salary</option>
          <option value="Refund">Refund</option>
          <option value="Commission">Commission</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
        >
          <option value="All">All Status</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>

        <button
          onClick={() => {
            setSearch('');
            setType('All');
            setStatus('All');
          }}
          className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
