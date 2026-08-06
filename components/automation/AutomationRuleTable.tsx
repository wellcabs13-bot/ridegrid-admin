'use client';

import {
  CheckCircle2,
  Clock3,
  Mail,
  Smartphone,
  Workflow,
} from 'lucide-react';

const rules = [
  {
    id: 'AUTO-001',
    name: 'Booking Confirmation',
    trigger: 'Booking Created',
    action: 'Send Email',
    status: 'Active',
  },
  {
    id: 'AUTO-002',
    name: 'Driver Assignment',
    trigger: 'Booking Created',
    action: 'Assign Driver',
    status: 'Active',
  },
  {
    id: 'AUTO-003',
    name: 'Document Expiry',
    trigger: 'Daily Scheduler',
    action: 'Send WhatsApp',
    status: 'Active',
  },
  {
    id: 'AUTO-004',
    name: 'Payment Reminder',
    trigger: 'Pending Payment',
    action: 'Send SMS',
    status: 'Draft',
  },
];

function actionIcon(action: string) {
  switch (action) {
    case 'Send Email':
      return <Mail size={16} />;
    case 'Send SMS':
    case 'Send WhatsApp':
      return <Smartphone size={16} />;
    default:
      return <Workflow size={16} />;
  }
}

export default function AutomationRuleTable() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-200 p-6">

        <h2 className="text-xl font-semibold">
          Automation Rules
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Active enterprise workflows.
        </p>

      </div>

      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-slate-50">

            <tr>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Rule
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Trigger
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Action
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {rules.map(rule => (

              <tr
                key={rule.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >

                <td className="px-6 py-4">

                  <div className="font-semibold">
                    {rule.name}
                  </div>

                  <div className="text-sm text-slate-500">
                    {rule.id}
                  </div>

                </td>

                <td className="px-6 py-4">
                  {rule.trigger}
                </td>

                <td className="px-6 py-4">

                  <div className="flex items-center gap-2">

                    {actionIcon(rule.action)}

                    {rule.action}

                  </div>

                </td>

                <td className="px-6 py-4">

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      rule.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {rule.status}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}