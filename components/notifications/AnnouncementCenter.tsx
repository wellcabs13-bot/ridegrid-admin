'use client';

const announcements = [
  {
    id: 1,
    title: 'System Maintenance',
    audience: 'All Users',
    priority: 'High',
    status: 'Published',
  },
  {
    id: 2,
    title: 'Independence Day Offer',
    audience: 'Customers',
    priority: 'Medium',
    status: 'Scheduled',
  },
  {
    id: 3,
    title: 'Vendor Policy Update',
    audience: 'Vendors',
    priority: 'Low',
    status: 'Draft',
  },
];

export default function AnnouncementCenter() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Announcement Center
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Publish important announcements for platform users.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          New Announcement
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Title
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Audience
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Priority
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {announcements.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium">{item.title}</td>

                <td className="px-6 py-4">{item.audience}</td>

                <td className="px-6 py-4">{item.priority}</td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
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
