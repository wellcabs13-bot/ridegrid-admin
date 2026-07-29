'use client';

interface Vendor {
  id: string;
  name: string;
  code: string;
  rating: number;
  vehicles: number;
  status: 'Active' | 'Inactive';
}

interface VendorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const vendors: Vendor[] = [
  {
    id: 'VEN001',
    name: 'ABC Travels',
    code: 'ABC',
    rating: 4.9,
    vehicles: 18,
    status: 'Active',
  },
  {
    id: 'VEN002',
    name: 'Wellcabs Partner',
    code: 'WCP',
    rating: 4.8,
    vehicles: 12,
    status: 'Active',
  },
  {
    id: 'VEN003',
    name: 'City Cab Services',
    code: 'CCS',
    rating: 4.6,
    vehicles: 9,
    status: 'Active',
  },
  {
    id: 'VEN004',
    name: 'Sai Tours',
    code: 'SAT',
    rating: 4.5,
    vehicles: 7,
    status: 'Inactive',
  },
];

export default function VendorSelect({
  value,
  onChange,
  disabled = false,
  error,
}: VendorSelectProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Vendor
        </label>

        <span className="text-xs text-slate-500">
          {vendors.filter((vendor) => vendor.status === 'Active').length} Active
        </span>
      </div>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full rounded-xl border px-4 py-3
          bg-white dark:bg-slate-900
          dark:border-slate-700
          dark:text-white
          transition
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-500
          disabled:cursor-not-allowed
          disabled:opacity-60
          ${error ? 'border-red-500' : 'border-slate-300'}
        `}
      >
        <option value="">Select Vendor</option>

        {vendors
          .filter((vendor) => vendor.status === 'Active')
          .map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name} • ⭐ {vendor.rating} • {vendor.vehicles} Vehicles
            </option>
          ))}
      </select>

      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}