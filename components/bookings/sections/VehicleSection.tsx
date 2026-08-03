'use client';

import VehicleAssignmentCard from '../VehicleAssignmentCard';

interface VehicleSectionProps {
  vendorId: string;
  vehicleId: string;
  driverId: string;

  setVendorId: (value: string) => void;
  setVehicleId: (value: string) => void;
  setDriverId: (value: string) => void;
}

export default function VehicleSection({
  vendorId,
  vehicleId,
  driverId,
  setVendorId,
  setVehicleId,
  setDriverId,
}: VehicleSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Vehicle Assignment
      </h2>

      <VehicleAssignmentCard
        vendorId={vendorId}
        vehicleId={vehicleId}
        driverId={driverId}
        onVendorChange={setVendorId}
        onVehicleChange={setVehicleId}
        onDriverChange={setDriverId}
      />
    </div>
  );
}