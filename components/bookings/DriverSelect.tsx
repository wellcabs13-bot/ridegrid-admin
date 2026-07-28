interface DriverSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const drivers = [
  'Ramesh Patil',
  'Suresh Pawar',
  'Mahesh Jadhav',
  'Ajay Shinde',
  'Vijay More',
];

export default function DriverSelect({ value, onChange }: DriverSelectProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">Driver</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-3"
      >
        <option value="">Select Driver</option>

        {drivers.map((driver) => (
          <option key={driver} value={driver}>
            {driver}
          </option>
        ))}
      </select>
    </div>
  );
}
