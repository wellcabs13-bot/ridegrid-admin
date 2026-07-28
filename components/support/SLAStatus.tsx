'use client';

const slaItems = [
  {
    id: 1,
    metric: 'First Response Time',
    target: '< 5 min',
    current: '3.2 min',
    status: 'Healthy',
  },
  {
    id: 2,
    metric: 'Resolution Time',
    target: '< 30 min',
    current: '28 min',
    status: 'Healthy',
  },
  {
    id: 3,
    metric: 'Escalation Rate',
    target: '< 5%',
    current: '6.1%',
    status: 'Warning',
  },
  {
    id: 4,
    metric: 'Customer Satisfaction',
    target: '> 4.5',
    current: '4.7',
    status: 'Healthy',
  },
];

const statusClasses = {
  Healthy: 'bg-green-100 text-green-700',
  Warning: 'bg-yellow-100 text-yellow-700',
};

export default function SLAStatus() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">SLA Status</h2>

        <p className="mt-1 text-sm text-slate-500">
          Monitor support service level agreements.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Metric
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Target
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Current
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {slaItems.map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{item.metric}</td>

                <td className="px-6 py-4">{item.target}</td>

                <td className="px-6 py-4">{item.current}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusClasses[item.status as keyof typeof statusClasses]
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
