'use client';

import { useEffect } from 'react';
import VendorSelect from './VendorSelect';
import VehicleSelect from './VehicleSelect';
import DriverSelect from './DriverSelect';

interface VehicleAssignmentCardProps {
  vendor: string;
  vehicle: string;
  driver: string;
  onVendorChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
  onDriverChange: (value: string) => void;
}

export default function VehicleAssignmentCard({
  vendor,
  vehicle,
  driver,
  onVendorChange,
  onVehicleChange,
  onDriverChange,
}: VehicleAssignmentCardProps) {
  useEffect(() => {
    onVehicleChange('');
    onDriverChange('');
  }, [vendor, onVehicleChange, onDriverChange]);

  useEffect(() => {
    onDriverChange('');
  }, [vehicle, onDriverChange]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Vehicle Assignment
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Assign Vendor, Vehicle and Driver for this booking.
          </p>
        </div>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          Operations
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <VendorSelect
          value={vendor}
          onChange={onVendorChange}
        />

        <VehicleSelect
          vendorId={vendor}
          value={vehicle}
          onChange={onVehicleChange}
        />

        <DriverSelect
          vehicleId={vehicle}
          value={driver}
          onChange={onDriverChange}
        />
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
        <h4 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Assignment Summary
        </h4>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Vendor
            </p>

            <p className="mt-1 font-medium text-slate-900 dark:text-white">
              {vendor || '--'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Vehicle
            </p>

            <p className="mt-1 font-medium text-slate-900 dark:text-white">
              {vehicle || '--'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Driver
            </p>

            <p className="mt-1 font-medium text-slate-900 dark:text-white">
              {driver || '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}