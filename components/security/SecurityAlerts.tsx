'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

const alerts = [
  {
    title: 'Multiple Failed Login Attempts',
    severity: 'Critical',
    time: '5 min ago',
    color: 'bg-red-100 text-red-600',
    icon: ShieldAlert,
  },
  {
    title: 'Password Policy Updated',
    severity: 'Info',
    time: '25 min ago',
    color: 'bg-blue-100 text-blue-600',
    icon: CheckCircle2,
  },
  {
    title: 'New Device Login',
    severity: 'Warning',
    time: '1 hour ago',
    color: 'bg-orange-100 text-orange-600',
    icon: AlertTriangle,
  },
];

export default function SecurityAlerts() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Security Alerts
      </h2>

      <div className="space-y-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;

          return (
            <div
              key={alert.title}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${alert.color}`}
                >
                  <Icon size={22} />
                </div>

                <div>
                  <h3 className="font-semibold">
                    {alert.title}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {alert.severity}
                  </p>
                </div>
              </div>

              <span className="text-sm text-slate-500">
                {alert.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}