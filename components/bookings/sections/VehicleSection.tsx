'use client';

import VehicleAssignmentCard from '../VehicleAssignmentCard';

interface VehicleSectionProps {
  vendor: string;
  vehicle: string;
  driver: string;

  setVendor: (value: string) => void;
  setVehicle: (value: string) => void;
  setDriver: (value: string) => void;
}

export default function VehicleSection({
  vendor,
  vehicle,
  driver,
  setVendor,
  setVehicle,
  setDriver,
}: VehicleSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Vehicle Assignment
      </h2>

      <VehicleAssignmentCard
        vendor={vendor}
        vehicle={vehicle}
        driver={driver}
        onVendorChange={setVendor}
        onVehicleChange={setVehicle}
        onDriverChange={setDriver}
      />
    </div>
  );
}