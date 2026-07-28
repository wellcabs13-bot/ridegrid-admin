'use client';

import { ReactNode } from 'react';

interface AddVehicleModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

export default function AddVehicleModal({
  isOpen,
  title = 'Add Vehicle',
  children,
  onClose,
}: AddVehicleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>

            <p className="mt-1 text-sm text-slate-500">
              Register a new vehicle into RideGrid.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
