'use client';

export default function ScheduledNotifications() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Scheduled Notifications
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Schedule notifications to be delivered automatically.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Campaign Name
          </label>

          <input
            type="text"
            placeholder="Weekend Offer"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Date</label>

            <input
              type="date"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Time</label>

            <input
              type="time"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Delivery Channel
          </label>

          <select className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none">
            <option>Push Notification</option>
            <option>Email</option>
            <option>SMS</option>
            <option>WhatsApp</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Schedule Notification
          </button>
        </div>
      </div>
    </div>
  );
}
