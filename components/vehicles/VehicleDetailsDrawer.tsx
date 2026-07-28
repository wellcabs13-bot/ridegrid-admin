'use client';

import { Vehicle } from '../../data/vehicles';

import VehicleInfoCard from './VehicleInfoCard';
import VehicleOwnerCard from './VehicleOwnerCard';
import VehicleInsuranceCard from './VehicleInsuranceCard';
import VehicleDocumentCard from './VehicleDocumentCard';
import VehicleTripHistoryCard from './VehicleTripHistoryCard';
import VehicleMaintenanceCard from './VehicleMaintenanceCard';

interface VehicleDetailsDrawerProps {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

export default function VehicleDetailsDrawer({
  open,
  vehicle,
  onClose,
}: VehicleDetailsDrawerProps) {
  if (!open || !vehicle) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-3xl overflow-y-auto bg-slate-100 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">Vehicle Details</h2>

            <p className="text-sm text-slate-500">{vehicle.registrationNo}</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-6">
          <VehicleInfoCard vehicle={vehicle} />

          <VehicleOwnerCard vehicle={vehicle} />

          <VehicleInsuranceCard vehicle={vehicle} />

          <VehicleDocumentCard vehicle={vehicle} />

          <VehicleTripHistoryCard vehicle={vehicle} />

          <VehicleMaintenanceCard vehicle={vehicle} />
        </div>
      </div>
    </>
  );
}
