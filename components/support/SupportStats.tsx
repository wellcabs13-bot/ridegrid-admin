'use client';

import { Ticket, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const stats = [
  {
    title: 'Total Tickets',
    value: '248',
    icon: Ticket,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  {
    title: 'Open Tickets',
    value: '34',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
  },
  {
    title: 'Resolved',
    value: '198',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    title: 'High Priority',
    value: '16',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
];

export default function SupportStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{item.title}</p>
                <h3 className="text-2xl font-bold mt-2">{item.value}</h3>
              </div>

              <div className={`p-3 rounded-xl ${item.bg}`}>
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}