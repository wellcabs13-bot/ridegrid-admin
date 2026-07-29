'use client';

import { X, Receipt, Printer } from 'lucide-react';

import BookingInfoCard from './BookingInfoCard';
import TripInfoCard from './TripInfoCard';
import PaymentInfoCard from './PaymentInfoCard';
import StatusTimeline from './StatusTimeline';

interface Props {
  open: boolean;
  booking: any;
  onClose: () => void;
}

export default function BookingDetailsDrawer({
  open,
  booking,
  onClose,
}: Props) {
  if (!open || !booking) return null;

  return (
    <>
      {/* Overlay */}

      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}

      <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col bg-slate-50 shadow-2xl">

        {/* Header */}

        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-8 py-6">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-blue-600">
                Booking Details
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                {booking.id}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                View complete booking information.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-100"
            >
              <X size={20} />
            </button>

          </div>

          {/* Action Buttons */}

          <div className="mt-6 flex flex-wrap gap-3">

            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">
              <Printer size={16} />
              Print
            </button>

            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">
              <Receipt size={16} />
              Invoice
            </button>

          </div>
        </div>

        {/* Content */}

        <div className="flex-1 space-y-6 overflow-y-auto p-8">

          <BookingInfoCard booking={booking} />

          <TripInfoCard booking={booking} />

          <PaymentInfoCard booking={booking} />

          <StatusTimeline />

        </div>
      </div>
    </>
  );
}