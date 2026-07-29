'use client';

interface Driver {
  id: string;
  vehicleId: string;
  name: string;
  phone: string;
  experience: number;
  status: 'Available' | 'On Trip' | 'Leave';
}

interface DriverSelectProps {
  vehicleId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const drivers: Driver[] = [
  {
    id: 'DR001',
    vehicleId: 'VH001',
    name: 'Ramesh Patil',
    phone: '9876543210',
    experience: 8,
    status: 'Available',
  },
  {
    id: 'DR002',
    vehicleId: 'VH002',
    name: 'Suresh Pawar',
    phone: '9876543211',
    experience: 6,
    status: 'Available',
  },
  {
    id: 'DR003',
    vehicleId: 'VH003',
    name: 'Mahesh Jadhav',
    phone: '9876543212',
    experience: 10,
    status: 'On Trip',
  },
  {
    id: 'DR004',
    vehicleId: 'VH004',
    name: 'Ajay Shinde',
    phone: '9876543213',
    experience: 5,
    status: 'Available',
  },
  {
    id: 'DR005',
    vehicleId: 'VH005',
    name: 'Vijay More',
    phone: '9876543214',
    experience: 7,
    status: 'Leave',
  },
];

export default function DriverSelect({
  vehicleId,
  value,
  onChange,
  disabled = false,
  error,
}: DriverSelectProps) {
  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.vehicleId === vehicleId &&
      driver.status === 'Available'
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Driver
        </label>

        <span className="text-xs text-slate-500">
          {filteredDrivers.length} Available
        </span>
      </div>

      <select
        value={value}
        disabled={disabled || !vehicleId}
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
          {vehicleId ? 'Select Driver' : 'Select Vehicle First'}
        </option>

        {filteredDrivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name} • {driver.experience} Years • {driver.phone}
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