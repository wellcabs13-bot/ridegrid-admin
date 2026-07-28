'use client';

import { Vehicle } from '../../data/vehicles';

interface VehicleMaintenanceCardProps {
  vehicle: Vehicle;
}

export default function VehicleMaintenanceCard({
  vehicle,
}: VehicleMaintenanceCardProps) {
  const maintenance = [
    {
      date: '10 Jul 2026',
      type: 'Engine Oil Service',
      workshop: 'Toyota Service Center',
      amount: '₹4,500',
      status: 'Completed',
    },
    {
      date: '18 Jun 2026',
      type: 'Brake Inspection',
      workshop: 'AutoCare Garage',
      amount: '₹2,800',
      status: 'Completed',
    },
    {
      date: '03 May 2026',
      type: 'Tyre Replacement',
      workshop: 'MRF Tyres',
      amount: '₹21,500',
      status: 'Completed',
    },
    {
      date: '15 Apr 2026',
      type: 'General Service',
      workshop: 'Authorized Workshop',
      amount: '₹6,900',
      status: 'Completed',
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Maintenance History</h3>

          <p className="mt-1 text-sm text-slate-500">
            Service & repair records
          </p>
        </div>

        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Schedule Service
        </button>
      </div>

      <div className="space-y-4">
        {maintenance.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border p-5 transition hover:border-blue-400"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-lg font-semibold">{item.type}</h4>

                <p className="mt-1 text-sm text-slate-500">{item.workshop}</p>
              </div>

              <div className="grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-slate-500">Date</p>

                  <p className="font-medium">{item.date}</p>
                </div>

                <div>
                  <p className="text-slate-500">Cost</p>

                  <p className="font-semibold text-green-600">{item.amount}</p>
                </div>

                <div>
                  <p className="text-slate-500">Status</p>

                  <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
