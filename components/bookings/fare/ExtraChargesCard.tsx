'use client';

import { ExtraCharges } from './types';

interface ExtraChargesCardProps {
  extras: ExtraCharges;
  setExtras: (extras: ExtraCharges) => void;
}

export default function ExtraChargesCard({
  extras,
  setExtras,
}: ExtraChargesCardProps) {
  function updateField(
    key: keyof ExtraCharges,
    value: number
  ) {
    setExtras({
      ...extras,
      [key]: value,
    });
  }

  const fields: {
    key: keyof ExtraCharges;
    label: string;
  }[] = [
    { key: 'toll', label: 'Toll Charges' },
    { key: 'parking', label: 'Parking Charges' },
    { key: 'permit', label: 'Permit Charges' },
    { key: 'stateTax', label: 'State Tax' },
    { key: 'driverAllowance', label: 'Driver Allowance' },
    { key: 'other', label: 'Other Charges' },
  ];

  const total =
    extras.toll +
    extras.parking +
    extras.permit +
    extras.stateTax +
    extras.driverAllowance +
    extras.other;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">
          Extra Charges
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-sm font-medium">
              {field.label}
            </label>

            <input
              type="number"
              min={0}
              value={extras[field.key]}
              onChange={(e) =>
                updateField(
                  field.key,
                  Number(e.target.value)
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        ))}

      </div>

      <div className="border-t bg-slate-50 px-6 py-4">

        <div className="flex items-center justify-between">

          <span className="font-medium">
            Total Extra Charges
          </span>

          <span className="text-xl font-bold text-blue-600">
            ₹ {total.toLocaleString('en-IN')}
          </span>

        </div>

      </div>

    </div>
  );
}