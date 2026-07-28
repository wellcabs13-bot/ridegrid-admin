'use client';

const templates = [
  {
    id: 1,
    name: 'Booking Confirmation',
    channel: 'Email',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Driver Assigned',
    channel: 'Push',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Trip Completed',
    channel: 'WhatsApp',
    status: 'Active',
  },
  {
    id: 4,
    name: 'Payment Received',
    channel: 'SMS',
    status: 'Draft',
  },
];

export default function TemplateManager() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Template Manager</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage reusable communication templates.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          New Template
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Template
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Channel
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {templates.map((template) => (
              <tr
                key={template.id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium text-slate-900">
                  {template.name}
                </td>

                <td className="px-6 py-4">{template.channel}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      template.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {template.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
