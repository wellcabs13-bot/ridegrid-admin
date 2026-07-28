interface CustomerFiltersProps {
  search: string;
  status: string;
  city: string;

  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCityChange: (value: string) => void;

  onReset: () => void;
}

export default function CustomerFilters({
  search,
  status,
  city,
  onSearchChange,
  onStatusChange,
  onCityChange,
  onReset,
}: CustomerFiltersProps) {
  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow">
      <div className="grid gap-4 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Customer..."
          className="rounded-lg border px-4 py-3"
        />

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-lg border px-4 py-3"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <input
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="City"
          className="rounded-lg border px-4 py-3"
        />

        <button
          onClick={onReset}
          className="rounded-lg border hover:bg-slate-100"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
