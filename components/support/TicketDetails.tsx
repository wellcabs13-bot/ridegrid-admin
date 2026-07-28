'use client';

import { supportTickets } from '@/data/support';

export default function TicketDetails() {
  const ticket = supportTickets[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Ticket Details</h2>

        <p className="mt-1 text-sm text-slate-500">
          Detailed information for the selected support ticket.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Ticket ID</p>
            <p className="font-semibold">{ticket.id}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Customer</p>
            <p className="font-semibold">{ticket.customer}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Category</p>
            <p>{ticket.category}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Channel</p>
            <p>{ticket.channel}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Assigned To</p>
            <p>{ticket.assignedTo}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Created On</p>
            <p>{ticket.createdAt}</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Internal Notes
          </label>

          <textarea
            rows={6}
            placeholder="Write investigation notes..."
            className="w-full rounded-xl border border-slate-300 p-4 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button className="rounded-xl border border-slate-300 px-5 py-3 hover:bg-slate-100">
            Assign Agent
          </button>

          <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">
            Update Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
