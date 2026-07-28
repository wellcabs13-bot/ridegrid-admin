'use client';

import { supportTickets } from '@/data/support';

const statusClasses = {
  Open: 'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-700',
};

export default function TicketTable() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold">Support Tickets</h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete ticket listing.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          New Ticket
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs uppercase font-semibold">
                Ticket
              </th>

              <th className="px-6 py-4 text-left text-xs uppercase font-semibold">
                Customer
              </th>

              <th className="px-6 py-4 text-left text-xs uppercase font-semibold">
                Assigned
              </th>

              <th className="px-6 py-4 text-left text-xs uppercase font-semibold">
                Channel
              </th>

              <th className="px-6 py-4 text-left text-xs uppercase font-semibold">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs uppercase font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {supportTickets.map((ticket) => (
              <tr key={ticket.id} className="border-t hover:bg-slate-50">
                <td className="px-6 py-4 font-semibold">{ticket.id}</td>

                <td className="px-6 py-4">{ticket.customer}</td>

                <td className="px-6 py-4">{ticket.assignedTo}</td>

                <td className="px-6 py-4">{ticket.channel}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusClasses[ticket.status]
                    }`}
                  >
                    {ticket.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
