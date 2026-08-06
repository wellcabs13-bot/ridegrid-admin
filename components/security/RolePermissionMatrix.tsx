'use client';

const roles = [
  'SUPER_ADMIN',
  'OPERATIONS',
  'FINANCE',
  'VENDOR',
  'DRIVER',
];

const modules = [
  'Dashboard',
  'Bookings',
  'Customers',
  'Drivers',
  'Vehicles',
  'Vendors',
  'Finance',
  'Reports',
  'Settings',
];

export default function RolePermissionMatrix() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-auto">

      <div className="border-b p-6">
        <h2 className="text-xl font-semibold">
          Role Permission Matrix
        </h2>
      </div>

      <table className="min-w-full">

        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-left">
              Module
            </th>

            {roles.map((role) => (
              <th
                key={role}
                className="px-5 py-4 text-center"
              >
                {role}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>

          {modules.map((module) => (
            <tr
              key={module}
              className="border-t"
            >
              <td className="px-5 py-4 font-medium">
                {module}
              </td>

              {roles.map((role) => (
                <td
                  key={role}
                  className="px-5 py-4 text-center"
                >
                  ✅
                </td>
              ))}

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}