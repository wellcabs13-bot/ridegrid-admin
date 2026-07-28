'use client';

export default function SMSCampaignCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">SMS Campaign</h2>

        <p className="mt-1 text-sm text-slate-500">
          Create and broadcast SMS campaigns to selected users.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Campaign Name
          </label>

          <input
            type="text"
            placeholder="Weekend Discount"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">SMS Message</label>

          <textarea
            rows={5}
            maxLength={160}
            placeholder="Write SMS message..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />

          <p className="mt-2 text-xs text-slate-500">Maximum 160 characters.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Recipient Group
          </label>

          <select className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none">
            <option>All Customers</option>
            <option>Active Customers</option>
            <option>Drivers</option>
            <option>Vendors</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Send SMS
          </button>
        </div>
      </div>
    </div>
  );
}
