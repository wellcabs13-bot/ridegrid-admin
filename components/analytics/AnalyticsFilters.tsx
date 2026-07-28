'use client';

interface AnalyticsFiltersProps {
  period: string;
  setPeriod: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
}

export default function AnalyticsFilters({
  period,
  setPeriod,
  city,
  setCity,
  category,
  setCategory,
}: AnalyticsFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
        >
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 3 Months</option>
          <option>Last 6 Months</option>
          <option>Last Year</option>
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
        >
          <option>All Cities</option>
          <option>Mumbai</option>
          <option>Pune</option>
          <option>Delhi</option>
          <option>Bangalore</option>
          <option>Hyderabad</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
        >
          <option>All Categories</option>
          <option>Sedan</option>
          <option>SUV</option>
          <option>Luxury</option>
          <option>Traveller</option>
        </select>

        <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">
          Apply Filters
        </button>
      </div>
    </div>
  );
}
