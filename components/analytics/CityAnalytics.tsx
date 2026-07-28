'use client';

const cities = [
  {
    city: 'Mumbai',
    bookings: 4218,
    revenue: '₹12.8L',
    growth: '+18%',
  },
  {
    city: 'Pune',
    bookings: 3824,
    revenue: '₹10.6L',
    growth: '+15%',
  },
  {
    city: 'Delhi',
    bookings: 3012,
    revenue: '₹8.9L',
    growth: '+13%',
  },
  {
    city: 'Bangalore',
    bookings: 2546,
    revenue: '₹7.4L',
    growth: '+11%',
  },
  {
    city: 'Hyderabad',
    bookings: 2231,
    revenue: '₹6.2L',
    growth: '+9%',
  },
];

export default function CityAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">City Performance</h2>

        <p className="mt-1 text-sm text-slate-500">
          Revenue & booking distribution by city
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {cities.map((city) => (
          <div
            key={city.city}
            className="flex items-center justify-between px-6 py-5 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{city.city}</h3>

              <p className="mt-1 text-sm text-slate-500">
                {city.bookings.toLocaleString()} Bookings
              </p>
            </div>

            <div className="text-right">
              <h3 className="font-bold text-indigo-600">{city.revenue}</h3>

              <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                {city.growth}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
