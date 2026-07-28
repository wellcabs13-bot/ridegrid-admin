'use client';

import { supportTickets } from '@/data/support';

const priorityClasses = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const statusClasses = {
  Open: 'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-700',
};

export default function TicketDashboard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Ticket Dashboard</h2>

        <p className="mt-1 text-sm text-slate-500">
          Overview of recently created support tickets.
        </p>
      </div>

      <div className="divide-y divide-slate-200">
        {supportTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{ticket.id}</h3>

              <p className="text-sm text-slate-500">{ticket.customer}</p>
            </div>

            <div className="font-medium">{ticket.category}</div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                priorityClasses[ticket.priority]
              }`}
            >
              {ticket.priority}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusClasses[ticket.status]
              }`}
            >
              {ticket.status}
            </span>

            <div className="text-sm text-slate-500">{ticket.channel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
