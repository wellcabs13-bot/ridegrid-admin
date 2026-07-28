'use client';

const heatMap = [
  [95, 88, 76, 61, 45, 58, 82],
  [91, 86, 71, 65, 49, 62, 80],
  [87, 82, 69, 57, 51, 66, 84],
  [78, 73, 64, 52, 46, 60, 74],
  [70, 66, 58, 48, 39, 54, 69],
];

const getColor = (value: number) => {
  if (value >= 90) return 'bg-indigo-700';
  if (value >= 80) return 'bg-indigo-600';
  if (value >= 70) return 'bg-indigo-500';
  if (value >= 60) return 'bg-indigo-400';
  if (value >= 50) return 'bg-indigo-300';
  return 'bg-slate-200';
};

export default function HeatMapCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Booking Heat Map</h2>

        <p className="mt-1 text-sm text-slate-500">
          Peak activity visualization
        </p>
      </div>

      <div className="space-y-3 p-6">
        {heatMap.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-3">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className={`flex h-11 w-11 items-center justify-center rounded-lg text-xs font-semibold text-white ${getColor(
                  cell
                )}`}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
