'use client';

export default function CancellationPolicy() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Cancellation Policy
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure customer cancellation and refund rules.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Save Policy
        </button>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Free Cancellation Before (Hours)
          </label>

          <input
            type="number"
            defaultValue={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Cancellation Charge (%)
          </label>

          <input
            type="number"
            defaultValue={20}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Policy Description
          </label>

          <textarea
            rows={5}
            defaultValue="Customers can cancel bookings free of charge before the configured time. After that, cancellation charges will be deducted automatically."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
