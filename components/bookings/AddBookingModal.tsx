'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddBookingModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

export default function AddBookingModal({
  isOpen,
  title = 'Create New Booking',
  children,
  onClose,
}: AddBookingModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-8 py-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div>
            <h2
              id="booking-modal-title"
              className="text-2xl font-bold text-slate-900 dark:text-white"
            >
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Fill in the booking details to create a new RideGrid booking.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}