'use client';

const timeline = [
  {
    id: 1,
    title: 'Ticket Created',
    description: 'Customer created a support ticket via WhatsApp.',
    time: '09:20 AM',
    color: 'bg-blue-500',
  },
  {
    id: 2,
    title: 'Assigned to Support Agent',
    description: 'Ticket assigned to Akash.',
    time: '09:24 AM',
    color: 'bg-indigo-500',
  },
  {
    id: 3,
    title: 'Customer Contacted',
    description: 'Support agent contacted customer.',
    time: '09:35 AM',
    color: 'bg-yellow-500',
  },
  {
    id: 4,
    title: 'Waiting for Customer',
    description: 'Awaiting customer confirmation.',
    time: '09:52 AM',
    color: 'bg-green-500',
  },
];

export default function TicketTimeline() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">Ticket Timeline</h2>

        <p className="mt-1 text-sm text-slate-500">
          Complete activity history of this ticket.
        </p>
      </div>

      <div className="space-y-6 p-6">
        {timeline.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className={`mt-1 h-4 w-4 rounded-full ${item.color}`} />

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>

                <span className="text-xs text-slate-400">{item.time}</span>
              </div>

              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
