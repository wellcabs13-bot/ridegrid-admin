'use client';

export default function WhatsAppSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          WhatsApp Business API
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure WhatsApp notifications and templates.
        </p>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Business Number
          </label>

          <input
            defaultValue="+91 9876543210"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">API Provider</label>

          <select className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500">
            <option>Meta Cloud API</option>
            <option>Twilio</option>
            <option>Gupshup</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Access Token</label>

          <input
            type="password"
            defaultValue="********************************"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <button className="rounded-xl border border-slate-300 px-5 py-3 hover:bg-slate-100">
            Send Test
          </button>

          <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
