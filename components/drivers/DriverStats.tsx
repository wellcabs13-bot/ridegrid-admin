'use client';

interface DriverStatsProps {
  totalDrivers: number;
}

export default function DriverStats({ totalDrivers }: DriverStatsProps) {
  const cards = [
    {
      title: 'Total Drivers',
      value: totalDrivers,
      color: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      title: 'Active Drivers',
      value: Math.round(totalDrivers * 0.8),
      color: 'bg-green-50',
      text: 'text-green-700',
    },
    {
      title: 'On Trip',
      value: Math.round(totalDrivers * 0.3),
      color: 'bg-orange-50',
      text: 'text-orange-700',
    },
    {
      title: 'Offline',
      value: Math.max(0, totalDrivers - Math.round(totalDrivers * 0.8)),
      color: 'bg-red-50',
      text: 'text-red-700',
    },
  ];

  return (
    <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`rounded-2xl border border-slate-200 ${card.color} p-6 shadow-sm`}
        >
          <p className="text-sm text-slate-500">{card.title}</p>

          <h2 className={`mt-3 text-4xl font-bold ${card.text}`}>
            {card.value}
          </h2>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-current"
              style={{ width: '75%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
