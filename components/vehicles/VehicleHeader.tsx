'use client';

import { Plus } from 'lucide-react';

interface VehicleHeaderProps {
  totalVehicles: number;
  onAddVehicle: () => void;
}

export default function VehicleHeader({
  totalVehicles,
  onAddVehicle,
}: VehicleHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
          Vehicles Management
        </h1>

        <p className="mt-1 max-w-3xl text-[13px] leading-5 text-neutral-500">
          Manage your fleet, vendor ownership, verification and availability.{' '}
          {totalVehicles.toLocaleString('en-IN')} vehicle
          {totalVehicles === 1 ? '' : 's'} in this view.
        </p>
      </div>

      <button type="button" onClick={onAddVehicle} className="rg-primary">
        <Plus size={15} />
        Add Vehicle
      </button>
    </div>
  );
}
