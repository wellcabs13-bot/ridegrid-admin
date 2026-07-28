'use client';

import { ReactNode } from 'react';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function AddDriverModal({
  isOpen,
  onClose,
  children,
}: AddDriverModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Add New Driver
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Register a new driver into RideGrid.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="driverForm"
            className="rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Save Driver
          </button>
        </div>
      </div>
    </div>
  );
}
