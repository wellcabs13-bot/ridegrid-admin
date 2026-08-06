'use client';

const logs = [
  {
    action: 'User Login',
    module: 'Authentication',
    user: 'Akshay',
    severity: 'LOW',
    time: '2 min ago',
  },
  {
    action: 'Role Updated',
    module: 'RBAC',
    user: 'Super Admin',
    severity: 'MEDIUM',
    time: '15 min ago',
  },
  {
    action: 'Failed Login',
    module: 'Authentication',
    user: 'Unknown',
    severity: 'HIGH',
    time: '28 min ago',
  },
];

export default function SecurityAuditLog() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b p-6">
        <h2 className="text-xl font-semibold">
          Security Audit Logs
        </h2>
      </div>

      <div className="divide-y">

        {logs.map((log) => (
          <div
            key={`${log.action}-${log.time}`}
            className="flex items-center justify-between p-5"
          >
            <div>

              <h3 className="font-semibold">
                {log.action}
              </h3>

              <p className="text-sm text-slate-500">
                {log.module} • {log.user}
              </p>

            </div>

            <div className="text-right">

              <p className="font-medium">
                {log.severity}
              </p>

              <p className="text-sm text-slate-500">
                {log.time}
              </p>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}