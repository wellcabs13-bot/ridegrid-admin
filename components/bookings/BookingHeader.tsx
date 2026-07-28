'use client';

interface BookingHeaderProps {
  totalBookings: number;
  onAddBooking: () => void;
}

export default function BookingHeader({
  totalBookings,
  onAddBooking,
}: BookingHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Booking Management
        </h1>

        <p className="mt-1 text-slate-500">Total Bookings : {totalBookings}</p>
      </div>

      <button
        onClick={onAddBooking}
        className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow hover:bg-blue-700 transition"
      >
        + Add Booking
      </button>
    </div>
  );
}
