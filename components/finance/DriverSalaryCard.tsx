'use client';

export default function DriverSalaryCard() {
  const totalDrivers = 86;
  const paidDrivers = 71;
  const pendingDrivers = totalDrivers - paidDrivers;

  const totalSalary = 965400;
  const paidSalary = 812600;
  const pendingSalary = totalSalary - paidSalary;

  const drivers = [
    {
      name: 'Rahul Patil',
      trips: 42,
      salary: 28600,
      status: 'Paid',
    },
    {
      name: 'Amit Shinde',
      trips: 36,
      salary: 24300,
      status: 'Pending',
    },
    {
      name: 'Suresh Pawar',
      trips: 48,
      salary: 31200,
      status: 'Paid',
    },
    {
      name: 'Vijay Jadhav',
      trips: 31,
      salary: 21800,
      status: 'Pending',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Driver Salaries
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monthly payroll overview
            </p>
          </div>

          <div className="rounded-xl bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">
            {totalDrivers} Drivers
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Paid</p>

          <h3 className="mt-2 text-2xl font-bold text-green-600">
            ₹{paidSalary.toLocaleString()}
          </h3>

          <p className="mt-2 text-sm text-slate-500">{paidDrivers} Drivers</p>
        </div>

        <div className="rounded-xl bg-red-50 p-5">
          <p className="text-sm text-slate-500">Pending</p>

          <h3 className="mt-2 text-2xl font-bold text-red-600">
            ₹{pendingSalary.toLocaleString()}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {pendingDrivers} Drivers
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {drivers.map((driver) => (
          <div
            key={driver.name}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <h4 className="font-semibold text-slate-900">{driver.name}</h4>

              <p className="text-sm text-slate-500">
                {driver.trips} Trips Completed
              </p>
            </div>

            <div className="text-right">
              <h4 className="font-bold text-slate-900">
                ₹{driver.salary.toLocaleString()}
              </h4>

              <span
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  driver.status === 'Paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {driver.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-slate-600">Payroll Progress</span>

          <span className="font-semibold text-slate-800">
            {Math.round((paidSalary / totalSalary) * 100)}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
            style={{
              width: `${(paidSalary / totalSalary) * 100}%`,
            }}
          />
        </div>

        <button className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
          View Complete Payroll
        </button>
      </div>
    </div>
  );
}
