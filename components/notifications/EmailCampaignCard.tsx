'use client';

export default function EmailCampaignCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Email Campaign</h2>

        <p className="mt-1 text-sm text-slate-500">
          Send promotional or transactional emails.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Campaign Name
          </label>

          <input
            type="text"
            placeholder="Festival Offer"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email Subject
          </label>

          <input
            type="text"
            placeholder="Special Offer from RideGrid"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email Content
          </label>

          <textarea
            rows={6}
            placeholder="Write email content..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-5 py-3 hover:bg-slate-100"
          >
            Save Draft
          </button>

          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}
