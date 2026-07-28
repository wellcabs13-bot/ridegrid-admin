'use client';

const failedNotifications = [
  {
    id: 1,
    channel: 'Email',
    recipient: 'john@example.com',
    reason: 'Mailbox Full',
    time: '10:15 AM',
  },
  {
    id: 2,
    channel: 'SMS',
    recipient: '+91 9876543210',
    reason: 'Invalid Number',
    time: '09:42 AM',
  },
  {
    id: 3,
    channel: 'Push',
    recipient: 'Customer #1025',
    reason: 'Device Offline',
    time: '08:50 AM',
  },
  {
    id: 4,
    channel: 'WhatsApp',
    recipient: '+91 9988776655',
    reason: 'Template Rejected',
    time: 'Yesterday',
  },
];

export default function FailedNotifications() {
  return (
    <div className="rounded-2xl border border-red-200 bg-white shadow-sm">
      <div className="border-b border-red-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Failed Notifications
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Notifications that were not successfully delivered.
            </p>
          </div>

          <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
            {failedNotifications.length} Failed
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-red-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Channel
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Recipient
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Failure Reason
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Time
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {failedNotifications.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-200 hover:bg-red-50"
              >
                <td className="px-6 py-4 font-medium">{item.channel}</td>

                <td className="px-6 py-4">{item.recipient}</td>

                <td className="px-6 py-4 text-red-600 font-medium">
                  {item.reason}
                </td>

                <td className="px-6 py-4">{item.time}</td>

                <td className="px-6 py-4 text-right">
                  <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                    Retry
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
