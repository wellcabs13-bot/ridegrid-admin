'use client';

export default function PushNotificationCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Push Notification</h2>

        <p className="mt-1 text-sm text-slate-500">
          Send instant notifications to customer and driver mobile apps.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Notification Title
          </label>

          <input
            type="text"
            placeholder="Enter notification title"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Message</label>

          <textarea
            rows={5}
            placeholder="Write your notification..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Audience</label>

          <select className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none">
            <option>All Users</option>
            <option>Customers</option>
            <option>Drivers</option>
            <option>Vendors</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Send Push Notification
          </button>
        </div>
      </div>
    </div>
  );
}
