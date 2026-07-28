'use client';

const activities = [
  {
    id: 1,
    activity: 'Ticket #TK-1024 resolved',
    user: 'Akash',
    time: '2 mins ago',
  },
  {
    id: 2,
    activity: 'Refund approved',
    user: 'Finance Team',
    time: '15 mins ago',
  },
  {
    id: 3,
    activity: 'WhatsApp conversation started',
    user: 'Rahul Sharma',
    time: '28 mins ago',
  },
  {
    id: 4,
    activity: 'Vendor verification completed',
    user: 'Vendor Team',
    time: '1 hour ago',
  },
];

export default function RecentSupportActivity() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">Recent Activity</h2>
      </div>

      <div className="divide-y">
        {activities.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-medium">{item.activity}</h3>

              <p className="mt-1 text-sm text-slate-500">{item.user}</p>
            </div>

            <span className="text-sm text-slate-400">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
