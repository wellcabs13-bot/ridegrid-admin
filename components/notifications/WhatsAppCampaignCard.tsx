'use client';

export default function WhatsAppCampaignCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">WhatsApp Campaign</h2>

        <p className="mt-1 text-sm text-slate-500">
          Broadcast promotional and transactional WhatsApp messages.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Campaign Name
          </label>

          <input
            type="text"
            placeholder="Festival Campaign"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-green-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Template Name
          </label>

          <select className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-green-600 focus:outline-none">
            <option>Booking Confirmation</option>
            <option>Driver Assigned</option>
            <option>Trip Completed</option>
            <option>Offer Campaign</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Message Preview
          </label>

          <textarea
            rows={5}
            placeholder="Preview of WhatsApp message..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-green-600 focus:outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Send WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
