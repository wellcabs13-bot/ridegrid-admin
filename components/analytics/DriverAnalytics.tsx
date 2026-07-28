'use client';

const drivers = [
  {
    name: 'Rahul Patil',
    trips: 428,
    earnings: '₹4.82L',
    rating: '4.9',
    completion: 99,
  },
  {
    name: 'Amit Shinde',
    trips: 401,
    earnings: '₹4.45L',
    rating: '4.8',
    completion: 98,
  },
  {
    name: 'Suresh Pawar',
    trips: 386,
    earnings: '₹4.21L',
    rating: '4.8',
    completion: 97,
  },
  {
    name: 'Vijay Jadhav',
    trips: 372,
    earnings: '₹4.06L',
    rating: '4.7',
    completion: 96,
  },
];

export default function DriverAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Top Drivers</h2>

        <p className="mt-1 text-sm text-slate-500">
          Highest performing drivers this month
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {drivers.map((driver) => (
          <div
            key={driver.name}
            className="flex items-center justify-between px-6 py-5 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{driver.name}</h3>

              <p className="mt-1 text-sm text-slate-500">
                {driver.trips} Trips • ⭐ {driver.rating}
              </p>
            </div>

            <div className="text-right">
              <h3 className="font-bold text-indigo-600">{driver.earnings}</h3>

              <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                {driver.completion}% Completion
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
