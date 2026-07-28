'use client';

import { Driver } from '../../data/drivers';

interface DriverPerformanceCardProps {
  driver: Driver;
}

export default function DriverPerformanceCard({
  driver,
}: DriverPerformanceCardProps) {
  const metrics = [
    {
      title: 'Customer Rating',
      value: `${driver.rating} / 5.0`,
      color: 'text-amber-600',
      progress: 98,
    },
    {
      title: 'Trip Acceptance',
      value: '96%',
      color: 'text-green-600',
      progress: 96,
    },
    {
      title: 'Trip Completion',
      value: '99%',
      color: 'text-blue-600',
      progress: 99,
    },
    {
      title: 'On-Time Arrival',
      value: '95%',
      color: 'text-purple-600',
      progress: 95,
    },
    {
      title: 'Customer Satisfaction',
      value: '97%',
      color: 'text-indigo-600',
      progress: 97,
    },
    {
      title: 'Safety Score',
      value: '100%',
      color: 'text-emerald-600',
      progress: 100,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Driver Performance
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Overall performance and service quality metrics.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        {metrics.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-700">{item.title}</p>

              <span className={`font-bold ${item.color}`}>{item.value}</span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Lifetime Trips</p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {driver.trips}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Lifetime Earnings</p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              ₹{driver.earnings.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Wallet Balance</p>

            <p className="mt-1 text-2xl font-bold text-blue-600">
              ₹{driver.wallet.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Current Status</p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {driver.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
