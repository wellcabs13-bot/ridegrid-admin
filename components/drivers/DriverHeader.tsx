'use client';

import { Plus } from 'lucide-react';

interface DriverHeaderProps {
  totalDrivers: number;
  onAddDriver: () => void;
}

export default function DriverHeader({
  totalDrivers,
  onAddDriver,
}: DriverHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
          Drivers Management
        </h1>

        <p className="mt-1 max-w-3xl text-[13px] leading-5 text-neutral-500">
          Manage registered drivers, documents, trip history and vehicle
          assignment from one place. {totalDrivers.toLocaleString('en-IN')}{' '}
          driver{totalDrivers === 1 ? '' : 's'} in this view.
        </p>
      </div>

      <button type="button" onClick={onAddDriver} className="rg-primary">
        <Plus size={15} />
        Add Driver
      </button>
    </div>
  );
}
