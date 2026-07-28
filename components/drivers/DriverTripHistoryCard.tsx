'use client';

import { Driver } from '../../data/drivers';

interface DriverTripHistoryCardProps {
  driver: Driver;
}

export default function DriverTripHistoryCard({
  driver,
}: DriverTripHistoryCardProps) {
  const trips = [
    {
      id: 'TRP-1001',
      date: '26 Jul 2026',
      from: 'Pune',
      to: 'Mumbai',
      fare: 3200,
      status: 'Completed',
    },
    {
      id: 'TRP-1002',
      date: '25 Jul 2026',
      from: 'Pune Airport',
      to: 'Lonavala',
      fare: 2400,
      status: 'Completed',
    },
    {
      id: 'TRP-1003',
      date: '24 Jul 2026',
      from: 'Pune',
      to: 'Shirdi',
      fare: 4800,
      status: 'Completed',
    },
    {
      id: 'TRP-1004',
      date: '23 Jul 2026',
      from: 'Pune',
      to: 'Nashik',
      fare: 3900,
      status: 'Completed',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Trip History</h3>

          <p className="mt-1 text-sm text-slate-500">
            Recent completed trips of {driver.name}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-2">
          <p className="text-xs text-slate-500">Total Trips</p>

          <p className="text-lg font-bold text-blue-700">{driver.trips}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Trip ID
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Date
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Route
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Fare
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {trips.map((trip) => (
              <tr
                key={trip.id}
                className="border-b border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium">{trip.id}</td>

                <td className="px-6 py-4">{trip.date}</td>

                <td className="px-6 py-4">
                  {trip.from} → {trip.to}
                </td>

                <td className="px-6 py-4 font-semibold text-green-600">
                  ₹{trip.fare.toLocaleString()}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {trip.status}
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
