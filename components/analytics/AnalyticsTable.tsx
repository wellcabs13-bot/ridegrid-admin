'use client';

const rows = [
  {
    city: 'Mumbai',
    bookings: 4218,
    revenue: '₹12.8L',
    commission: '₹1.82L',
    growth: '+18%',
  },
  {
    city: 'Pune',
    bookings: 3824,
    revenue: '₹10.6L',
    commission: '₹1.46L',
    growth: '+15%',
  },
  {
    city: 'Delhi',
    bookings: 3012,
    revenue: '₹8.9L',
    commission: '₹1.18L',
    growth: '+13%',
  },
  {
    city: 'Bangalore',
    bookings: 2546,
    revenue: '₹7.4L',
    commission: '₹94K',
    growth: '+11%',
  },
  {
    city: 'Hyderabad',
    bookings: 2231,
    revenue: '₹6.2L',
    commission: '₹82K',
    growth: '+9%',
  },
];

export default function AnalyticsTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          City Performance Report
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Revenue, bookings and commission by city
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                City
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                Bookings
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                Revenue
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                Commission
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                Growth
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.city}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-semibold text-slate-900">
                  {row.city}
                </td>

                <td className="px-6 py-4 text-right text-slate-700">
                  {row.bookings.toLocaleString()}
                </td>

                <td className="px-6 py-4 text-right font-semibold text-indigo-600">
                  {row.revenue}
                </td>

                <td className="px-6 py-4 text-right font-semibold text-green-600">
                  {row.commission}
                </td>

                <td className="px-6 py-4 text-right">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    {row.growth}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
