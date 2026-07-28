'use client';

import { notificationTabs } from '@/data/notifications';

export default function NotificationTabs() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {notificationTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium transition hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <span>{tab.label}</span>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
