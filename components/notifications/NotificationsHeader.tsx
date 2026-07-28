'use client';

import { notificationSummary } from '@/data/notifications';

export default function NotificationsHeader() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {notificationSummary.title}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {notificationSummary.description}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-100"
          >
            View History
          </button>

          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            New Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
