'use client';

import {
  CheckCircle2,
  Clock3,
  Workflow,
} from 'lucide-react';

const activities = [
  {
    title: 'Booking Confirmation Executed',
    description: 'Confirmation email sent successfully.',
    time: '2 min ago',
  },
  {
    title: 'Driver Assigned',
    description: 'Nearest available driver selected.',
    time: '7 min ago',
  },
  {
    title: 'WhatsApp Reminder Sent',
    description: 'Vehicle document expiry notification.',
    time: '18 min ago',
  },
  {
    title: 'Daily Automation Completed',
    description: 'All scheduled jobs executed.',
    time: '1 hour ago',
  },
];

export default function AutomationActivity() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h2 className="text-xl font-semibold">
            Automation Activity
          </h2>

          <p className="text-sm text-slate-500">
            Recent workflow executions.
          </p>

        </div>

        <Workflow className="text-emerald-600" />

      </div>

      <div className="space-y-5">

        {activities.map(activity => (

          <div
            key={activity.title}
            className="flex items-center gap-4"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">

              <CheckCircle2
                className="text-emerald-600"
                size={20}
              />

            </div>

            <div className="flex-1">

              <h3 className="font-medium text-slate-900">
                {activity.title}
              </h3>

              <p className="text-sm text-slate-500">
                {activity.description}
              </p>

            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">

              <Clock3 size={16} />

              {activity.time}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}