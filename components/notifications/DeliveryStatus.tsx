'use client';

const delivery = [
  {
    channel: 'Push Notifications',
    sent: 5024,
    delivered: 4898,
    failed: 126,
    rate: '97.5%',
  },
  {
    channel: 'Email',
    sent: 3210,
    delivered: 3165,
    failed: 45,
    rate: '98.6%',
  },
  {
    channel: 'SMS',
    sent: 1688,
    delivered: 1655,
    failed: 33,
    rate: '98.0%',
  },
  {
    channel: 'WhatsApp',
    sent: 2875,
    delivered: 2836,
    failed: 39,
    rate: '98.6%',
  },
];

export default function DeliveryStatus() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Delivery Status</h2>

        <p className="mt-1 text-sm text-slate-500">
          Delivery performance across all communication channels.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Channel
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                Sent
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                Delivered
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                Failed
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                Rate
              </th>
            </tr>
          </thead>

          <tbody>
            {delivery.map((row) => (
              <tr
                key={row.channel}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium">{row.channel}</td>

                <td className="px-6 py-4 text-right">
                  {row.sent.toLocaleString()}
                </td>

                <td className="px-6 py-4 text-right text-green-600 font-semibold">
                  {row.delivered.toLocaleString()}
                </td>

                <td className="px-6 py-4 text-right text-red-600 font-semibold">
                  {row.failed}
                </td>

                <td className="px-6 py-4 text-right font-bold text-indigo-600">
                  {row.rate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
