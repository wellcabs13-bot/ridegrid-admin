'use client';

interface CustomerSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const customers = [
  {
    id: 'CUS001',
    name: 'Rahul Sharma',
    phone: '+91 9876543210',
  },
  {
    id: 'CUS002',
    name: 'Akash Patil',
    phone: '+91 9876543211',
  },
  {
    id: 'CUS003',
    name: 'Amit Joshi',
    phone: '+91 9876543212',
  },
  {
    id: 'CUS004',
    name: 'Sneha Kulkarni',
    phone: '+91 9876543213',
  },
  {
    id: 'CUS005',
    name: 'Priya Deshmukh',
    phone: '+91 9876543214',
  },
];

export default function CustomerSelect({
  value,
  onChange,
  disabled = false,
  error,
}: CustomerSelectProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Customer
        </label>

        <span className="text-xs text-slate-400">
          {customers.length} Customers
        </span>
      </div>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full rounded-xl border px-4 py-3
          bg-white
          dark:bg-slate-900
          dark:border-slate-700
          dark:text-white
          transition
          focus:ring-2
          focus:ring-blue-500
          focus:border-blue-500
          disabled:opacity-60
          disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-slate-300'}
        `}
      >
        <option value="">Select Customer</option>

        {customers.map((customer) => (
          <option
            key={customer.id}
            value={customer.name}
          >
            {customer.name} • {customer.phone}
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