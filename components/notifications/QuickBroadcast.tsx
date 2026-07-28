'use client';

export default function QuickBroadcast() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
      <div className="p-8">
        <h2 className="text-2xl font-bold">Quick Broadcast</h2>

        <p className="mt-2 text-indigo-100">
          Send an emergency or important announcement across all communication
          channels instantly.
        </p>

        <div className="mt-6 space-y-5">
          <input
            type="text"
            placeholder="Broadcast Title"
            className="w-full rounded-xl border-0 px-4 py-3 text-slate-900 outline-none"
          />

          <textarea
            rows={5}
            placeholder="Write your broadcast message..."
            className="w-full rounded-xl border-0 px-4 py-3 text-slate-900 outline-none"
          />

          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
              <input type="checkbox" defaultChecked />
              Push
            </label>

            <label className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
              <input type="checkbox" defaultChecked />
              Email
            </label>

            <label className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
              <input type="checkbox" defaultChecked />
              SMS
            </label>

            <label className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
              <input type="checkbox" defaultChecked />
              WhatsApp
            </label>
          </div>

          <div className="flex justify-end">
            <button className="rounded-xl bg-white px-8 py-3 font-semibold text-indigo-700 transition hover:bg-slate-100">
              Broadcast Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
