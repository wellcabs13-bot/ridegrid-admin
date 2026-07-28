'use client';

const history = [
  {
    id: 1,
    channel: 'Email',
    title: 'Booking Confirmation',
    sent: '24 Jul 2026',
    recipients: 1250,
    status: 'Completed',
  },
  {
    id: 2,
    channel: 'Push',
    title: 'Driver Assigned',
    sent: '25 Jul 2026',
    recipients: 486,
    status: 'Completed',
  },
  {
    id: 3,
    channel: 'SMS',
    title: 'Payment Reminder',
    sent: '26 Jul 2026',
    recipients: 312,
    status: 'Failed',
  },
];

export default function NotificationHistory() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Notification History
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review previously sent notifications.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Channel
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Notification
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Sent On
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Recipients
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {history.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4">{item.channel}</td>

                <td className="px-6 py-4 font-medium">{item.title}</td>

                <td className="px-6 py-4">{item.sent}</td>

                <td className="px-6 py-4">{item.recipients}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
