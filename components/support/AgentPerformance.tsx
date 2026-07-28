'use client';

import { agentPerformance } from '@/data/support';

export default function AgentPerformance() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">Agent Performance</h2>
        <p className="mt-1 text-sm text-slate-500">
          Performance overview of support executives.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Agent
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Tickets
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Avg Response
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Rating
              </th>
            </tr>
          </thead>

          <tbody>
            {agentPerformance.map((agent) => (
              <tr key={agent.id} className="border-t hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{agent.name}</td>

                <td className="px-6 py-4">{agent.ticketsHandled}</td>

                <td className="px-6 py-4">{agent.averageResponseTime}</td>

                <td className="px-6 py-4">⭐ {agent.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
