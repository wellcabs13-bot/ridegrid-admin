'use client';

const activities = [
  {
    id: 1,
    user: 'Super Admin',
    action: 'Updated Commission Settings',
    module: 'Finance',
    date: '26 Jul 2026',
    time: '09:20 AM',
  },
  {
    id: 2,
    user: 'Operations Manager',
    action: 'Created Vendor',
    module: 'Vendor',
    date: '26 Jul 2026',
    time: '10:15 AM',
  },
  {
    id: 3,
    user: 'Support Executive',
    action: 'Cancelled Booking',
    module: 'Booking',
    date: '26 Jul 2026',
    time: '11:42 AM',
  },
  {
    id: 4,
    user: 'Finance Admin',
    action: 'Generated GST Report',
    module: 'Reports',
    date: '26 Jul 2026',
    time: '12:30 PM',
  },
];

export default function ActivityLogs() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Activity Logs</h2>

        <p className="mt-1 text-sm text-slate-500">
          Monitor administrator activities across the RideGrid platform.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                User
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Activity
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Module
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Date
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Time
              </th>
            </tr>
          </thead>

          <tbody>
            {activities.map((activity) => (
              <tr
                key={activity.id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium text-slate-900">
                  {activity.user}
                </td>

                <td className="px-6 py-4">{activity.action}</td>

                <td className="px-6 py-4">{activity.module}</td>

                <td className="px-6 py-4">{activity.date}</td>

                <td className="px-6 py-4">{activity.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
