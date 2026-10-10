'use client';

import { Search } from 'lucide-react';

interface VehicleFiltersProps {
  search: string;
  status: string;
  city: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onReset: () => void;
}

export default function VehicleFilters({
  search,
  status,
  city,
  onSearchChange,
  onStatusChange,
  onCityChange,
  onReset,
}: VehicleFiltersProps) {
  return (
    <div className="rg-card mb-5 flex flex-wrap items-center gap-2.5 p-3">
      <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 focus-within:border-red-500">
        <Search size={15} className="text-neutral-400" />

        <input
          value={search}
          aria-label="Search vehicles"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by registration, make, model or vendor…"
          className="!min-h-0 !border-0 !bg-transparent !p-0 !py-2 min-w-0 w-full outline-none"
        />
      </label>

      <select
        value={status}
        aria-label="Status"
        onChange={(e) => onStatusChange(e.target.value)}
        className="rg-input !w-auto"
      >
        <option value="">All statuses</option>
        <option>Available</option>
        <option>On Trip</option>
        <option>Maintenance</option>
        <option>Inactive</option>
      </select>

      <input
        value={city}
        aria-label="City"
        onChange={(e) => onCityChange(e.target.value)}
        placeholder="City"
        className="rg-input !w-40"
      />

      <button type="button" onClick={onReset} className="rg-secondary">
        Reset
      </button>
    </div>
  );
}
