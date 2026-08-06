'use client';

import {
  Activity,
  CheckCircle2,
  Clock3,
  Workflow,
} from 'lucide-react';

const stats = [
  {
    title: 'Active Rules',
    value: '86',
    icon: Workflow,
    color: 'bg-emerald-500',
  },
  {
    title: 'Executions Today',
    value: '14,268',
    icon: Activity,
    color: 'bg-blue-500',
  },
  {
    title: 'Success Rate',
    value: '99.6%',
    icon: CheckCircle2,
    color: 'bg-violet-500',
  },
  {
    title: 'Average Runtime',
    value: '410 ms',
    icon: Clock3,
    color: 'bg-orange-500',
  },
];

export default function AutomationStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  {item.title}
                </p>

                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {item.value}
                </h3>

              </div>

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${item.color}`}
              >
                <Icon className="h-7 w-7" />
              </div>

            </div>

          </div>
        );
      })}

    </div>
  );
}