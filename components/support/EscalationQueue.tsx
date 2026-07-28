'use client';

const escalations = [
  {
    id: 'ESC-1001',
    issue: 'Driver No Show',
    priority: 'Critical',
    owner: 'Operations',
  },
  {
    id: 'ESC-1002',
    issue: 'Vendor Payment Dispute',
    priority: 'High',
    owner: 'Finance',
  },
  {
    id: 'ESC-1003',
    issue: 'Refund Delay',
    priority: 'Medium',
    owner: 'Support',
  },
];

const priorityClasses = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
};

export default function EscalationQueue() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">Escalation Queue</h2>

        <p className="mt-1 text-sm text-slate-500">
          High priority issues awaiting resolution.
        </p>
      </div>

      <div className="divide-y">
        {escalations.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h3 className="font-semibold">{item.id}</h3>

              <p className="text-sm text-slate-500">{item.issue}</p>
            </div>

            <div>{item.owner}</div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                priorityClasses[item.priority as keyof typeof priorityClasses]
              }`}
            >
              {item.priority}
            </span>

            <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
              Open
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
