interface CustomerStatsProps {
  total: number;
  active: number;
  inactive: number;
  revenue: number;
}

export default function CustomerStats({
  total,
  active,
  inactive,
  revenue,
}: CustomerStatsProps) {
  const cards = [
    {
      title: 'Total Customers',
      value: total,
    },
    {
      title: 'Active',
      value: active,
    },
    {
      title: 'Inactive',
      value: inactive,
    },
    {
      title: 'Revenue',
      value: `₹${revenue.toLocaleString('en-IN')}`,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-slate-500">{card.title}</p>

          <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>
        </div>
      ))}
    </div>
  );
}
