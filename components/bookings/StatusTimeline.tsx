'use client';

import {
  CheckCircle2,
  Circle,
  Clock3,
} from 'lucide-react';

const timeline = [
  {
    title: 'Booking Created',
    description: 'Customer successfully placed the booking.',
    completed: true,
  },
  {
    title: 'Vendor Accepted',
    description: 'Vendor accepted the booking request.',
    completed: true,
  },
  {
    title: 'Driver Assigned',
    description: 'Driver has been assigned for the trip.',
    completed: true,
  },
  {
    title: 'Trip Started',
    description: 'Journey has not started yet.',
    completed: false,
  },
  {
    title: 'Trip Completed',
    description: 'Trip completion is pending.',
    completed: false,
  },
];

export default function StatusTimeline() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
          <Clock3 className="h-5 w-5 text-amber-600" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Booking Timeline
          </h3>

          <p className="text-sm text-slate-500">
            Track the booking lifecycle.
          </p>
        </div>
      </div>

      {/* Timeline */}

      <div className="space-y-6">
        {timeline.map((item, index) => (
          <div key={index} className="relative flex gap-4">

            {/* Vertical Line */}

            {index !== timeline.length - 1 && (
              <div className="absolute left-[14px] top-8 h-full w-px bg-slate-200" />
            )}

            {/* Icon */}

            <div className="relative z-10 mt-1">
              {item.completed ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              ) : (
                <Circle className="h-7 w-7 text-slate-300" />
              )}
            </div>

            {/* Content */}

            <div className="pb-2">
              <h4
                className={`font-semibold ${
                  item.completed
                    ? 'text-slate-900'
                    : 'text-slate-500'
                }`}
              >
                {item.title}
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                {item.description}
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  item.completed
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.completed ? 'Completed' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}