'use client';

import CustomerSelect from '../CustomerSelect';

interface CustomerSectionProps {
  customer: string;
  setCustomer: (value: string) => void;
}

export default function CustomerSection({
  customer,
  setCustomer,
}: CustomerSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Customer Details
      </h2>

      <CustomerSelect
        value={customer}
        onChange={setCustomer}
      />
    </div>
  );
}