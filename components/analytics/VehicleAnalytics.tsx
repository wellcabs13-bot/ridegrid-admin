'use client';

const vehicles = [
  {
    category: 'Sedan',
    bookings: 5128,
    utilization: 92,
    revenue: '₹14.6L',
  },
  {
    category: 'SUV',
    bookings: 3864,
    utilization: 89,
    revenue: '₹12.2L',
  },
  {
    category: 'Hatchback',
    bookings: 2541,
    utilization: 84,
    revenue: '₹7.1L',
  },
  {
    category: 'Tempo Traveller',
    bookings: 1138,
    utilization: 78,
    revenue: '₹6.8L',
  },
  {
    category: 'Luxury',
    bookings: 624,
    utilization: 74,
    revenue: '₹5.3L',
  },
];

export default function VehicleAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Vehicle Performance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Fleet utilization & revenue analysis
        </p>
      </div>

      <div className="space-y-6 p-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.category}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {vehicle.category}
                </h3>

                <p className="text-sm text-slate-500">
                  {vehicle.bookings.toLocaleString()} Bookings
                </p>
              </div>

              <div className="text-right">
                <h3 className="font-bold text-indigo-600">{vehicle.revenue}</h3>

                <p className="text-sm text-slate-500">
                  {vehicle.utilization}% Utilization
                </p>
              </div>
            </div>

            <div className="h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500"
                style={{
                  width: `${vehicle.utilization}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
