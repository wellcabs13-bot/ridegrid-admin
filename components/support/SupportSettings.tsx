'use client';

export default function SupportSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">Support Settings</h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure support workflows and communication.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <label className="flex items-center justify-between">
          <span>Enable Live Chat</span>

          <input type="checkbox" defaultChecked />
        </label>

        <label className="flex items-center justify-between">
          <span>Enable WhatsApp Support</span>

          <input type="checkbox" defaultChecked />
        </label>

        <label className="flex items-center justify-between">
          <span>Email Notifications</span>

          <input type="checkbox" defaultChecked />
        </label>

        <label className="flex items-center justify-between">
          <span>Auto Ticket Assignment</span>

          <input type="checkbox" defaultChecked />
        </label>

        <label className="flex items-center justify-between">
          <span>SLA Alerts</span>

          <input type="checkbox" defaultChecked />
        </label>

        <div className="pt-4">
          <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
