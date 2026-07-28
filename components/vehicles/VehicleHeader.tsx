'use client';

interface VehicleHeaderProps {
  totalVehicles: number;
  onAddVehicle: () => void;
}

export default function VehicleHeader({
  totalVehicles,
  onAddVehicle,
}: VehicleHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Vehicle Management
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your fleet, documents, insurance and vehicle availability.
        </p>

        <div className="mt-3 inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700">
          Total Vehicles : {totalVehicles}
        </div>
      </div>

      <button
        onClick={onAddVehicle}
        className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        + Add Vehicle
      </button>
    </div>
  );
}
