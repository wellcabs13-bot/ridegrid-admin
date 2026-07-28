'use client';

const logs = [
  {
    id: 1,
    channel: 'Email',
    recipient: 'john@example.com',
    template: 'Booking Confirmation',
    status: 'Delivered',
    date: '27 Jul 2026',
  },
  {
    id: 2,
    channel: 'Push',
    recipient: 'Customer #1008',
    template: 'Driver Assigned',
    status: 'Delivered',
    date: '27 Jul 2026',
  },
  {
    id: 3,
    channel: 'SMS',
    recipient: '+91 9876543210',
    template: 'Payment Reminder',
    status: 'Pending',
    date: '26 Jul 2026',
  },
  {
    id: 4,
    channel: 'WhatsApp',
    recipient: '+91 9988776655',
    template: 'Trip Completed',
    status: 'Failed',
    date: '26 Jul 2026',
  },
];

export default function CommunicationLogs() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Communication Logs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Searchable communication history across all channels.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search logs..."
          className="w-64 rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Channel
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Recipient
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Template
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Status
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium">{log.channel}</td>

                <td className="px-6 py-4">{log.recipient}</td>

                <td className="px-6 py-4">{log.template}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      log.status === 'Delivered'
                        ? 'bg-green-100 text-green-700'
                        : log.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">{log.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
