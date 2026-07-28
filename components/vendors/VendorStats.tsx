interface VendorStatsProps {
  total: number;
  active: number;
  inactive: number;
  earnings: number;
}

export default function VendorStats({
  total,
  active,
  inactive,
  earnings,
}: VendorStatsProps) {
  const cards = [
    {
      title: 'Total Vendors',
      value: total,
    },
    {
      title: 'Active Vendors',
      value: active,
    },
    {
      title: 'Inactive Vendors',
      value: inactive,
    },
    {
      title: 'Vendor Earnings',
      value: `₹${earnings.toLocaleString('en-IN')}`,
    },
  ];

  return (
    <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-slate-500">{card.title}</p>

          <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>
        </div>
      ))}
    </div>
  );
}
