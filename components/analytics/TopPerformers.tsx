'use client';

const performers = [
  {
    rank: 1,
    name: 'Sai Travels',
    type: 'Vendor',
    score: 98,
  },
  {
    rank: 2,
    name: 'Rahul Patil',
    type: 'Driver',
    score: 97,
  },
  {
    rank: 3,
    name: 'Mumbai',
    type: 'City',
    score: 96,
  },
  {
    rank: 4,
    name: 'SUV Category',
    type: 'Vehicle',
    score: 94,
  },
  {
    rank: 5,
    name: 'Corporate Clients',
    type: 'Customer Segment',
    score: 93,
  },
];

export default function TopPerformers() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Top Performers</h2>

        <p className="mt-1 text-sm text-slate-500">
          Highest performing business entities
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {performers.map((item) => (
          <div
            key={item.rank}
            className="flex items-center justify-between px-6 py-5 hover:bg-slate-50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                {item.rank}
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">{item.name}</h3>

                <p className="text-sm text-slate-500">{item.type}</p>
              </div>
            </div>

            <span className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              {item.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
