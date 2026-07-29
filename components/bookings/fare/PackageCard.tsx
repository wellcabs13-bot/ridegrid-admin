'use client';

interface PackageCardProps {
  packageHours: number;
  setPackageHours: (value: number) => void;

  packageKm: number;
  setPackageKm: (value: number) => void;

  extraKm: number;
  setExtraKm: (value: number) => void;

  extraKmRate: number;
  setExtraKmRate: (value: number) => void;

  extraHours: number;
  setExtraHours: (value: number) => void;

  extraHourRate: number;
  setExtraHourRate: (value: number) => void;
}

export default function PackageCard({
  packageHours,
  setPackageHours,

  packageKm,
  setPackageKm,

  extraKm,
  setExtraKm,

  extraKmRate,
  setExtraKmRate,

  extraHours,
  setExtraHours,

  extraHourRate,
  setExtraHourRate,
}: PackageCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">
          Hourly Rental Package
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        <Input
          label="Package Hours"
          value={packageHours}
          onChange={setPackageHours}
        />

        <Input
          label="Package KM"
          value={packageKm}
          onChange={setPackageKm}
        />

        <Input
          label="Extra KM"
          value={extraKm}
          onChange={setExtraKm}
        />

        <Input
          label="Extra KM Rate"
          value={extraKmRate}
          onChange={setExtraKmRate}
        />

        <Input
          label="Extra Hours"
          value={extraHours}
          onChange={setExtraHours}
        />

        <Input
          label="Extra Hour Rate"
          value={extraHourRate}
          onChange={setExtraHourRate}
        />

      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value))
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}