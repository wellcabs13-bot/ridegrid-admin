interface Props {
  booking: any;
}

export default function BookingInfoCard({ booking }: Props) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h3 className="mb-4 text-lg font-bold">Booking Information</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Booking ID</p>
          <p className="font-semibold">{booking.id}</p>
        </div>

        <div>
          <p className="text-slate-500">Customer</p>
          <p className="font-semibold">{booking.customer}</p>
        </div>

        <div>
          <p className="text-slate-500">Vehicle</p>
          <p className="font-semibold">{booking.vehicle}</p>
        </div>

        <div>
          <p className="text-slate-500">Status</p>
          <p className="font-semibold">{booking.status}</p>
        </div>

        <div>
          <p className="text-slate-500">Payment</p>
          <p className="font-semibold">{booking.payment}</p>
        </div>

        <div>
          <p className="text-slate-500">Journey Date</p>
          <p className="font-semibold">{booking.date}</p>
        </div>
      </div>
    </div>
  );
}
