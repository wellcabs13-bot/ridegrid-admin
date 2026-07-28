'use client';

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
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold">Booking Details</h2>

            <p className="text-sm text-slate-500">{booking.id}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-6">
          <BookingInfoCard booking={booking} />

          <TripInfoCard booking={booking} />

          <PaymentInfoCard booking={booking} />

          <StatusTimeline />
        </div>
      </div>
    </>
  );
}
