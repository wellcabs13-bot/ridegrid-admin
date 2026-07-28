interface VehicleSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const vehicles = [
  'Swift Dzire',
  'Maruti Ertiga',
  'Toyota Innova',
  'Toyota Crysta',
  'Tempo Traveller',
];

export default function VehicleSelect({ value, onChange }: VehicleSelectProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">Vehicle</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-4 py-3"
      >
        <option value="">Select Vehicle</option>

        {vehicles.map((vehicle) => (
          <option key={vehicle} value={vehicle}>
            {vehicle}
          </option>
        ))}
      </select>
    </div>
  );
}
