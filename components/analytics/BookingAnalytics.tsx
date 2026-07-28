'use client';

const bookingData = [
  { label: 'Completed', value: 8245, color: 'bg-green-500', percent: 58 },
  { label: 'Running', value: 1328, color: 'bg-blue-500', percent: 9 },
  { label: 'Upcoming', value: 2548, color: 'bg-indigo-500', percent: 18 },
  { label: 'Cancelled', value: 612, color: 'bg-red-500', percent: 4 },
  { label: 'Pending', value: 1553, color: 'bg-orange-500', percent: 11 },
];

export default function BookingAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Booking Analytics</h2>

        <p className="mt-1 text-sm text-slate-500">
          Booking distribution overview
        </p>
      </div>

      <div className="space-y-6 p-6">
        {bookingData.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between">
              <span className="font-medium text-slate-700">{item.label}</span>

              <span className="font-semibold text-slate-900">
                {item.value.toLocaleString()}
              </span>
            </div>

            <div className="h-3 rounded-full bg-slate-100">
              <div
                className={`${item.color} h-3 rounded-full`}
                style={{
                  width: `${item.percent}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
