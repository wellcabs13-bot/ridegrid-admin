'use client';

const logs = [
  {
    time: '09:45 AM',
    event: 'Vendor Approved',
    user: 'Admin',
    status: 'Success',
  },
  {
    time: '10:18 AM',
    event: 'Booking Created',
    user: 'Customer',
    status: 'Success',
  },
  {
    time: '11:06 AM',
    event: 'Payment Failed',
    user: 'Gateway',
    status: 'Failed',
  },
  {
    time: '11:45 AM',
    event: 'Driver Login',
    user: 'Driver',
    status: 'Success',
  },
];

export default function SystemLogs() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">System Logs</h2>

        <p className="mt-1 text-sm text-slate-500">
          Recent system activities across the RideGrid platform.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Time
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Event
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                User
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, index) => (
              <tr
                key={index}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4">{log.time}</td>

                <td className="px-6 py-4 font-medium text-slate-900">
                  {log.event}
                </td>

                <td className="px-6 py-4">{log.user}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      log.status === 'Success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.status}
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
