'use client';

interface Vehicle {
  id: string;
  vendorId: string;
  registrationNo: string;
  model: string;
  category: string;
  status: 'Available' | 'On Trip' | 'Maintenance';
}

interface VehicleSelectProps {
  vendorId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const vehicles: Vehicle[] = [
  {
    id: 'VH001',
    vendorId: 'VEN001',
    registrationNo: 'MH12AB1234',
    model: 'Toyota Innova Crysta',
    category: 'SUV',
    status: 'Available',
  },
  {
    id: 'VH002',
    vendorId: 'VEN001',
    registrationNo: 'MH12CD5678',
    model: 'Maruti Ertiga',
    category: 'MUV',
    status: 'Available',
  },
  {
    id: 'VH003',
    vendorId: 'VEN002',
    registrationNo: 'MH14EF2468',
    model: 'Swift Dzire',
    category: 'Sedan',
    status: 'On Trip',
  },
  {
    id: 'VH004',
    vendorId: 'VEN002',
    registrationNo: 'MH14GH1357',
    model: 'Toyota Innova',
    category: 'SUV',
    status: 'Available',
  },
  {
    id: 'VH005',
    vendorId: 'VEN003',
    registrationNo: 'MH13JK7890',
    model: 'Tempo Traveller',
    category: 'Traveller',
    status: 'Maintenance',
  },
];

export default function VehicleSelect({
  vendorId,
  value,
  onChange,
  disabled = false,
  error,
}: VehicleSelectProps) {
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.vendorId === vendorId &&
      vehicle.status !== 'Maintenance'
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Vehicle
        </label>

        <span className="text-xs text-slate-500">
          {filteredVehicles.length} Available
        </span>
      </div>

      <select
        value={value}
        disabled={disabled || !vendorId}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full rounded-xl border px-4 py-3
          bg-white dark:bg-slate-900
          dark:border-slate-700
          dark:text-white
          transition
          focus:ring-2
          focus:ring-blue-500
          focus:border-blue-500
          disabled:cursor-not-allowed
          disabled:opacity-60
          ${error ? 'border-red-500' : 'border-slate-300'}
        `}
      >
        <option value="">
          {vendorId ? 'Select Vehicle' : 'Select Vendor First'}
        </option>

        {filteredVehicles.map((vehicle) => (
          <option
            key={vehicle.id}
            value={vehicle.id}
          >
            {vehicle.model} • {vehicle.registrationNo} • {vehicle.category}
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