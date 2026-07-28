'use client';

const growth = [
  { month: 'Jan', value: 18 },
  { month: 'Feb', value: 26 },
  { month: 'Mar', value: 32 },
  { month: 'Apr', value: 41 },
  { month: 'May', value: 56 },
  { month: 'Jun', value: 68 },
  { month: 'Jul', value: 82 },
];

export default function GrowthChart() {
  const max = Math.max(...growth.map((g) => g.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Business Growth
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monthly company growth trend
            </p>
          </div>

          <span className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            +24.5%
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex h-80 items-end justify-between gap-4">
          {growth.map((item) => (
            <div key={item.month} className="flex flex-1 flex-col items-center">
              <div
                style={{
                  height: `${(item.value / max) * 100}%`,
                }}
                className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-emerald-600 via-green-500 to-lime-400 transition-all duration-300 hover:scale-105"
              />

              <span className="mt-4 text-sm font-semibold text-slate-600">
                {item.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Current</p>

          <h3 className="mt-2 text-xl font-bold text-green-600">24.5%</h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Average</p>

          <h3 className="mt-2 text-xl font-bold text-indigo-600">18.7%</h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Status</p>

          <h3 className="mt-2 text-xl font-bold text-emerald-600">Excellent</h3>
        </div>
      </div>
    </div>
  );
}
