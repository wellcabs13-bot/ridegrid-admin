'use client';

import {
  Brain,
  Clock3,
  Sparkles,
} from 'lucide-react';

const activities = [
  {
    title: 'Dynamic Pricing Executed',
    module: 'Pricing Engine',
    time: '2 min ago',
  },
  {
    title: 'Driver Recommendation Generated',
    module: 'Booking AI',
    time: '8 min ago',
  },
  {
    title: 'Fraud Analysis Completed',
    module: 'Risk Engine',
    time: '16 min ago',
  },
  {
    title: 'Demand Forecast Updated',
    module: 'Analytics',
    time: '30 min ago',
  },
];

export default function AIActivity() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h2 className="text-xl font-semibold text-slate-900">
            AI Activity
          </h2>

          <p className="text-sm text-slate-500">
            Latest AI engine executions.
          </p>

        </div>

        <Sparkles className="text-indigo-600" />

      </div>

      <div className="space-y-5">

        {activities.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-4"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">

              <Brain
                className="text-indigo-600"
                size={20}
              />

            </div>

            <div className="flex-1">

              <h3 className="font-medium text-slate-900">
                {item.title}
              </h3>

              <p className="text-sm text-slate-500">
                {item.module}
              </p>

            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">

              <Clock3 size={16} />

              {item.time}

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}