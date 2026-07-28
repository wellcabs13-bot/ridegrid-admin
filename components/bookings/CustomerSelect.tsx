interface CustomerSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const customers = [
  'Rahul Sharma',
  'Akash Patil',
  'Amit Joshi',
  'Sneha Kulkarni',
  'Priya Deshmukh',
];

export default function CustomerSelect({
  value,
  onChange,
}: CustomerSelectProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">Customer</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-3"
      >
        <option value="">Select Customer</option>

        {customers.map((customer) => (
          <option key={customer} value={customer}>
            {customer}
          </option>
        ))}
      </select>
    </div>
  );
}
