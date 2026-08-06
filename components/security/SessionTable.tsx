'use client';

const sessions = [
  {
    user: 'Akshay',
    role: 'SUPER_ADMIN',
    device: 'Chrome Windows',
    ip: '192.168.1.10',
    status: 'Active',
  },
  {
    user: 'Operations',
    role: 'OPERATIONS',
    device: 'Edge',
    ip: '192.168.1.15',
    status: 'Active',
  },
];

export default function SessionTable() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b p-6">
        <h2 className="text-xl font-semibold">
          Active Sessions
        </h2>
      </div>

      <table className="min-w-full">

        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-left">User</th>
            <th className="px-5 py-4 text-left">Role</th>
            <th className="px-5 py-4 text-left">Device</th>
            <th className="px-5 py-4 text-left">IP</th>
            <th className="px-5 py-4 text-left">Status</th>
          </tr>
        </thead>

        <tbody>

          {sessions.map((session) => (
            <tr
              key={session.user}
              className="border-t"
            >
              <td className="px-5 py-4">
                {session.user}
              </td>

              <td className="px-5 py-4">
                {session.role}
              </td>

              <td className="px-5 py-4">
                {session.device}
              </td>

              <td className="px-5 py-4">
                {session.ip}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                  {session.status}
                </span>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}