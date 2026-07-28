'use client';

const analytics = [
  {
    id: 1,
    channel: 'Push',
    sent: 18520,
    delivered: '98.2%',
    opened: '81%',
    clicks: '42%',
  },
  {
    id: 2,
    channel: 'Email',
    sent: 12140,
    delivered: '99.1%',
    opened: '56%',
    clicks: '24%',
  },
  {
    id: 3,
    channel: 'SMS',
    sent: 8940,
    delivered: '97.9%',
    opened: '96%',
    clicks: '18%',
  },
  {
    id: 4,
    channel: 'WhatsApp',
    sent: 6540,
    delivered: '99.3%',
    opened: '91%',
    clicks: '48%',
  },
];

export default function NotificationAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Notification Analytics
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Channel-wise communication performance overview.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Channel
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                Sent
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                Delivered
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                Open Rate
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                Click Rate
              </th>
            </tr>
          </thead>

          <tbody>
            {analytics.map((row) => (
              <tr
                key={row.id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-semibold">{row.channel}</td>

                <td className="px-6 py-4 text-right">
                  {row.sent.toLocaleString()}
                </td>

                <td className="px-6 py-4 text-right text-green-600 font-semibold">
                  {row.delivered}
                </td>

                <td className="px-6 py-4 text-right">{row.opened}</td>

                <td className="px-6 py-4 text-right text-indigo-600 font-bold">
                  {row.clicks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
