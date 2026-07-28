'use client';

const activities = [
  {
    id: 1,
    title: 'Email Campaign Sent',
    description: 'Festival Offer was sent to 12,140 customers.',
    time: '5 min ago',
  },
  {
    id: 2,
    title: 'Push Notification Delivered',
    description: 'Driver Assigned notification delivered successfully.',
    time: '18 min ago',
  },
  {
    id: 3,
    title: 'WhatsApp Campaign Scheduled',
    description: 'Weekend Discount scheduled for tomorrow.',
    time: '1 hour ago',
  },
  {
    id: 4,
    title: 'SMS Campaign Completed',
    description: 'Payment Reminder delivered to 8,940 users.',
    time: '3 hours ago',
  },
];

export default function RecentActivity() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>

        <p className="mt-1 text-sm text-slate-500">
          Latest communication events across RideGrid.
        </p>
      </div>

      <div className="divide-y divide-slate-200">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start justify-between p-6 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{activity.title}</h3>

              <p className="mt-1 text-sm text-slate-500">
                {activity.description}
              </p>
            </div>

            <span className="text-xs text-slate-400 whitespace-nowrap">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
