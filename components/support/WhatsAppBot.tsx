'use client';

const flows = [
  {
    id: 1,
    trigger: 'Booking Created',
    action: 'Send Booking Confirmation',
    status: 'Active',
  },
  {
    id: 2,
    trigger: 'Driver Assigned',
    action: 'Notify Customer',
    status: 'Active',
  },
  {
    id: 3,
    trigger: 'Trip Completed',
    action: 'Collect Feedback',
    status: 'Active',
  },
  {
    id: 4,
    trigger: 'Payment Failed',
    action: 'Send Payment Reminder',
    status: 'Paused',
  },
];

const statusClasses = {
  Active: 'bg-green-100 text-green-700',
  Paused: 'bg-yellow-100 text-yellow-700',
};

export default function WhatsAppBot() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            WhatsApp Automation Bot
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure automated customer conversations and workflow triggers.
          </p>
        </div>

        <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          Create Flow
        </button>
      </div>

      <div className="space-y-5 p-6">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="rounded-xl border border-slate-200 p-5 transition hover:shadow-md"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-slate-500">Trigger</p>

                <h3 className="font-semibold text-slate-900">{flow.trigger}</h3>
              </div>

              <div>
                <p className="text-sm text-slate-500">Action</p>

                <h3 className="font-semibold text-slate-900">{flow.action}</h3>
              </div>

              <span
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  statusClasses[flow.status as keyof typeof statusClasses]
                }`}
              >
                {flow.status}
              </span>

              <button className="rounded-lg border border-slate-300 px-5 py-2 hover:bg-slate-100">
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Future Integrations
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            Meta WhatsApp Business Cloud API
          </div>

          <div className="rounded-xl border bg-white p-4">Twilio WhatsApp</div>

          <div className="rounded-xl border bg-white p-4">Interakt</div>

          <div className="rounded-xl border bg-white p-4">AiSensy</div>

          <div className="rounded-xl border bg-white p-4">WATI</div>

          <div className="rounded-xl border bg-white p-4">Gupshup</div>
        </div>
      </div>
    </div>
  );
}
