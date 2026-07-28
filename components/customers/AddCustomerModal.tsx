'use client';

import { ReactNode } from 'react';

interface AddCustomerModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

export default function AddCustomerModal({
  isOpen,
  title = 'Add Customer',
  children,
  onClose,
}: AddCustomerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}

        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>

            <p className="mt-1 text-sm text-slate-500">
              Fill customer information below.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
          >
            ×
          </button>
        </div>

        {/* Body */}

        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>

        {/* Footer */}

        <div className="flex justify-end border-t bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
