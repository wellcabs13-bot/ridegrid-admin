'use client';

import { Vehicle } from '../../data/vehicles';

interface VehicleTripHistoryCardProps {
  vehicle: Vehicle;
}

export default function VehicleTripHistoryCard({
  vehicle,
}: VehicleTripHistoryCardProps) {
  const trips = [
    {
      id: 'TRP10251',
      customer: 'Rahul Sharma',
      route: 'Pune → Mumbai',
      date: '18 Jul 2026',
      amount: '₹8,500',
      status: 'Completed',
    },
    {
      id: 'TRP10218',
      customer: 'Sneha Patil',
      route: 'Pune → Shirdi',
      date: '15 Jul 2026',
      amount: '₹6,800',
      status: 'Completed',
    },
    {
      id: 'TRP10182',
      customer: 'Corporate Booking',
      route: 'Mumbai Airport',
      date: '12 Jul 2026',
      amount: '₹12,000',
      status: 'Completed',
    },
    {
      id: 'TRP10150',
      customer: 'Wellcabs',
      route: 'Pune Local',
      date: '08 Jul 2026',
      amount: '₹3,900',
      status: 'Completed',
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Trip History</h3>

          <p className="mt-1 text-sm text-slate-500">
            Total Trips : {vehicle.totalTrips}
          </p>
        </div>

        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
          {vehicle.earnings}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Trip ID</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Route</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-4 font-semibold">{trip.id}</td>

                <td className="px-4 py-4">{trip.customer}</td>

                <td className="px-4 py-4">{trip.route}</td>

                <td className="px-4 py-4">{trip.date}</td>

                <td className="px-4 py-4 font-semibold text-green-600">
                  {trip.amount}
                </td>

                <td className="px-4 py-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
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
