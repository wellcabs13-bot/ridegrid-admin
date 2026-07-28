'use client';

interface VehicleStatsProps {
  total: number;
  available: number;
  onTrip: number;
  maintenance: number;
  revenue: string;
}

export default function VehicleStats({
  total,
  available,
  onTrip,
  maintenance,
  revenue,
}: VehicleStatsProps) {
  const cards = [
    {
      title: 'Total Vehicles',
      value: total,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Available',
      value: available,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'On Trip',
      value: onTrip,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Maintenance',
      value: maintenance,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Revenue',
      value: revenue,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="mb-8 grid gap-5 md:grid-cols-5">
      {cards.map((card) => (
        <div key={card.title} className={`rounded-xl ${card.bg} p-5 shadow-sm`}>
          <p className="text-sm text-slate-500">{card.title}</p>

          <h2 className={`mt-3 text-3xl font-bold ${card.color}`}>
            {card.value}
          </h2>
        </div>
      ))}
    </div>
  );
}
