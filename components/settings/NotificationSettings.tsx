'use client';

import { notificationSettings } from '@/data/settings';

export default function NotificationSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Notification Settings
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enable or disable system notifications.
        </p>
      </div>

      <div className="space-y-5 p-6">
        {[
          {
            label: 'Email Notifications',
            value: notificationSettings.email,
          },
          {
            label: 'SMS Notifications',
            value: notificationSettings.sms,
          },
          {
            label: 'WhatsApp Notifications',
            value: notificationSettings.whatsapp,
          },
          {
            label: 'Push Notifications',
            value: notificationSettings.push,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-5"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{item.label}</h3>

              <p className="text-sm text-slate-500">
                Allow system generated notifications.
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                defaultChecked={item.value}
                className="peer sr-only"
              />

              <div className="peer h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
