'use client';

export default function EmailSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Email Configuration
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure SMTP server and outgoing email settings.
        </p>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">SMTP Host</label>

          <input
            defaultValue="smtp.gmail.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">SMTP Port</label>

          <input
            defaultValue="587"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email Address
          </label>

          <input
            defaultValue="support@ridegrid.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Sender Name</label>

          <input
            defaultValue="RideGrid"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <button className="rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-100">
            Test Email
          </button>

          <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
            Save SMTP
          </button>
        </div>
      </div>
    </div>
  );
}
