'use client';

import { ReactNode } from 'react';

interface AddBookingModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

export default function AddBookingModal({
  isOpen,
  title = 'Add Booking',
  children,
  onClose,
}: AddBookingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>

          <button onClick={onClose} className="text-xl hover:text-red-600">
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
