'use client';

import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react';

const stats = [
  {
    title: "Active Sessions",
    value: "184",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    title: "Failed Logins",
    value: "8",
    icon: AlertTriangle,
    color: "bg-red-500",
  },
  {
    title: "Audit Logs",
    value: "18,492",
    icon: Activity,
    color: "bg-indigo-500",
  },
  {
    title: "Security Score",
    value: "98%",
    icon: Shield,
    color: "bg-green-500",
  },
];

export default function SecurityStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  {item.title}
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  {item.value}
                </h3>

              </div>

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${item.color}`}
              >
                <Icon size={24} />
              </div>

            </div>
          </div>
        );
      })}

    </div>
  );
}