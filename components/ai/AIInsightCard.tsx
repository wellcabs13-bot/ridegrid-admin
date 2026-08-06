'use client';

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  TrendingUp,
} from 'lucide-react';

const insights = [
  {
    title: 'Revenue Growth',
    description:
      'Revenue increased by 18.4% compared to last month.',
    icon: TrendingUp,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    title: 'Demand Prediction',
    description:
      'High demand expected this weekend in Pune and Mumbai.',
    icon: BadgeCheck,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'Fraud Detection',
    description:
      '3 suspicious bookings detected for manual verification.',
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-600',
  },
];

export default function AIInsightCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            AI Insights
          </h2>

          <p className="text-sm text-slate-500">
            Latest business recommendations from RideGrid AI.
          </p>
        </div>

      </div>

      <div className="space-y-4">

        {insights.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-start justify-between rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
            >
              <div className="flex gap-4">

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon size={22} />
                </div>

                <div>

                  <h3 className="font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>

                </div>

              </div>

              <ArrowRight
                size={18}
                className="text-slate-400"
              />

            </div>
          );
        })}

      </div>

    </div>
  );
}