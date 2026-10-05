'use client';

import { Search } from 'lucide-react';

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
    <div className="rg-card mb-5 flex flex-wrap items-center gap-2.5 p-3">
      <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 focus-within:border-red-500">
        <Search size={15} className="text-neutral-400" />

        <input
          type="text"
          aria-label="Search drivers"
          placeholder="Search by name, mobile or vehicle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!min-h-0 !border-0 !bg-transparent !p-0 !py-2 min-w-0 w-full outline-none"
        />
      </label>

      <select
        aria-label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rg-input !w-auto"
      >
        <option value="All">All statuses</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="Blocked">Blocked</option>
      </select>

      <button
        type="button"
        onClick={() => {
          setSearch('');
          setStatus('All');
        }}
        className="rg-secondary"
      >
        Reset
      </button>
    </div>
  );
}
