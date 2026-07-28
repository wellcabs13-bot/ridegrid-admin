'use client';

const templates = [
  {
    id: 1,
    name: 'Booking Confirmation',
    category: 'UTILITY',
    language: 'English',
    status: 'Approved',
  },
  {
    id: 2,
    name: 'Driver Assigned',
    category: 'UTILITY',
    language: 'English',
    status: 'Approved',
  },
  {
    id: 3,
    name: 'Payment Reminder',
    category: 'MARKETING',
    language: 'English',
    status: 'Pending',
  },
  {
    id: 4,
    name: 'Refund Update',
    category: 'UTILITY',
    language: 'English',
    status: 'Approved',
  },
];

const statusClasses = {
  Approved: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function WhatsAppTemplates() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            WhatsApp Templates
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage Meta approved WhatsApp Business templates.
          </p>
        </div>

        <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          New Template
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Template
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Category
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Language
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {templates.map((template) => (
              <tr key={template.id} className="border-t hover:bg-slate-50">
                <td className="px-6 py-4 font-semibold">{template.name}</td>

                <td className="px-6 py-4">{template.category}</td>

                <td className="px-6 py-4">{template.language}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusClasses[
                        template.status as keyof typeof statusClasses
                      ]
                    }`}
                  >
                    {template.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
                    Edit
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
