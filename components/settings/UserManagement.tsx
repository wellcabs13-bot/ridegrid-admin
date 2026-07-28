'use client';

import { userStatistics } from '@/data/settings';

export default function UserManagement() {
  const cards = [
    {
      title: 'Administrators',
      value: userStatistics.totalAdmins,
    },
    {
      title: 'Managers',
      value: userStatistics.totalManagers,
    },
    {
      title: 'Support Staff',
      value: userStatistics.totalSupport,
    },
    {
      title: 'Total Users',
      value: userStatistics.totalUsers,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage administrators and staff access.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Add User
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200 p-5 transition hover:shadow-md"
          >
            <p className="text-sm text-slate-500">{card.title}</p>

            <h3 className="mt-3 text-3xl font-bold text-slate-900">
              {card.value}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
}
