'use client';

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
    <div className="mb-8 rounded-xl bg-white p-6 shadow">
      <div className="grid gap-4 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search vehicle..."
          className="rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
        />

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-lg border px-4 py-3"
        >
          <option value="">All Status</option>
          <option>Available</option>
          <option>On Trip</option>
          <option>Maintenance</option>
          <option>Inactive</option>
        </select>

        <input
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="City"
          className="rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
        />

        <button
          onClick={onReset}
          className="rounded-lg border bg-slate-100 px-5 py-3 hover:bg-slate-200"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
