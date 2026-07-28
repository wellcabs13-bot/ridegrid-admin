'use client';

import { notificationStats } from '@/data/notifications';

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
} as const;

export default function NotificationStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {notificationStats.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              {item.title}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                colorClasses[item.color as keyof typeof colorClasses]
              }`}
            >
              {item.change}
            </span>
          </div>

          <h2 className="mt-5 text-3xl font-bold text-slate-900">
            {item.value}
          </h2>
        </div>
      ))}
    </div>
  );
}
