interface Props {
  booking: any;
}

export default function TripInfoCard({ booking }: Props) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h3 className="mb-4 text-lg font-bold">Trip Information</h3>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-500">Pickup</p>

          <p className="font-semibold">{booking.pickup || 'Not Assigned'}</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Drop</p>

          <p className="font-semibold">{booking.drop || 'Not Assigned'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Driver</p>

            <p className="font-semibold">{booking.driver || 'Pending'}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Vendor</p>

            <p className="font-semibold">{booking.vendor || 'Pending'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
