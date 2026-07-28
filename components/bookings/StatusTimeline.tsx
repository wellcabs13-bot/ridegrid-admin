const timeline = [
  {
    title: 'Booking Created',
    completed: true,
  },
  {
    title: 'Vendor Accepted',
    completed: true,
  },
  {
    title: 'Driver Assigned',
    completed: true,
  },
  {
    title: 'Trip Started',
    completed: false,
  },
  {
    title: 'Trip Completed',
    completed: false,
  },
];

export default function StatusTimeline() {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h3 className="mb-6 text-lg font-bold">Booking Timeline</h3>

      <div className="space-y-5">
        {timeline.map((item, index) => (
          <div key={index} className="flex items-center gap-4">
            <div
              className={`h-4 w-4 rounded-full ${
                item.completed ? 'bg-green-500' : 'bg-slate-300'
              }`}
            />

            <div>
              <p className="font-medium">{item.title}</p>

              <p className="text-xs text-slate-500">
                {item.completed ? 'Completed' : 'Pending'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
