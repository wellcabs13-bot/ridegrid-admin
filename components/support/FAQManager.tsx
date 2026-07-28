'use client';

const faqs = [
  {
    id: 1,
    question: 'How do I cancel my booking?',
    answer: 'Customers can cancel from My Bookings.',
  },
  {
    id: 2,
    question: 'How are refunds processed?',
    answer: 'Refunds are processed within 5–7 business days.',
  },
  {
    id: 3,
    question: 'How can vendors update vehicle details?',
    answer: 'From Vendor Dashboard → Vehicles.',
  },
  {
    id: 4,
    question: 'How do drivers receive payouts?',
    answer: 'Weekly settlements to the registered bank account.',
  },
];

export default function FAQManager() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold">FAQ Manager</h2>

          <p className="mt-1 text-sm text-slate-500">
            Frequently asked questions shown across RideGrid.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">
          Add FAQ
        </button>
      </div>

      <div className="divide-y">
        {faqs.map((faq) => (
          <div key={faq.id} className="p-6">
            <h3 className="font-semibold text-slate-900">{faq.question}</h3>

            <p className="mt-3 text-sm text-slate-600">{faq.answer}</p>

            <div className="mt-4 flex gap-3">
              <button className="rounded-lg border px-4 py-2 hover:bg-slate-100">
                Edit
              </button>

              <button className="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
